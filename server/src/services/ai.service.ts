import { LLMFactory } from '../ai/llm.factory';
import { ISystemConfigRepository } from '../repositories/interfaces/ISystemConfigRepository';
import { IEmployeeRepository } from '../repositories/interfaces/IEmployeeRepository';
import { IAllocationRepository } from '../repositories/interfaces/IAllocationRepository';
import { IProjectRepository } from '../repositories/interfaces/IProjectRepository';
import { ITimesheetRepository } from '../repositories/interfaces/ITimesheetRepository';
import { EmployeeSkillDetail } from '../models/interfaces/Employee';
import { NotFoundError, ConfigurationError } from '../exceptions';

// ── Skill Match ───────────────────────────────────────────────────────────────

export interface SkillMatchInput {
  required_skills:      string[];
  project_description?: string;
}

export interface CandidateContext {
  name:          string;
  department:    string;
  status:        string;
  free_pct:      number;
  free_hours_pw: number;
  skills:        string;
}

// ── Risk Summary ──────────────────────────────────────────────────────────────

export interface ProjectRiskContext {
  project_name:      string;
  status:            string;
  end_date:          string;
  total_sp:          number;
  done_sp:           number;
  overdue_count:     number;
  milestones:        string;
  allocations:       string;
  last_week_effort:  string;
}

// ── Team Match ────────────────────────────────────────────────────────────────

export interface SkillRequirement {
  skill:            string;
  min_proficiency?: string;
}

export interface RoleRequirement {
  role_name:       string;
  required_skills: SkillRequirement[];
}

export interface TeamMatchInput {
  project_name?:        string;
  project_description?: string;
  roles:                RoleRequirement[];
}

export interface FilledRole {
  role_name:       string;
  required_skills: SkillRequirement[];
  assigned: {
    name:           string;
    department:     string;
    free_pct:       number;
    free_hours_pw:  number;
    matched_skills: string[];
    missing_skills: string[];
    all_skills:     string;
  };
}

export interface GapCandidate {
  name:      string;
  free_date: string;
}

export interface UnfilledRole {
  role_name:             string;
  required_skills:       SkillRequirement[];
  gap_type:              'NO_SKILL_IN_TEAM' | 'ALL_ALLOCATED';
  missing_skills:        string[];
  candidates_with_skill: GapCandidate[];
}

export interface TeamMatchResult {
  filled:    FilledRole[];
  unfilled:  UnfilledRole[];
  narrative: string;
}

// Internal pool entry used during greedy matching
interface PoolEntry {
  id:           number;
  name:         string;
  department:   string;
  free_pct:     number;
  free_hours_pw: number;
  skills:       EmployeeSkillDetail[];
  latest_end:   string | null;
}

// ── Service ───────────────────────────────────────────────────────────────────

export class AIService {
  constructor(
    private configRepo:     ISystemConfigRepository,
    private employeeRepo:   IEmployeeRepository,
    private allocationRepo: IAllocationRepository,
    private projectRepo:    IProjectRepository,
    private timesheetRepo:  ITimesheetRepository
  ) {}

  // ── Skill Match ─────────────────────────────────────────────────────────────

  async skillMatch(_managerEmployeeId: number, input: SkillMatchInput): Promise<string> {
    const config = await this.configRepo.getAll();
    if (!config.llm_api_key) throw new ConfigurationError('LLM API key not configured. Go to System Configuration.');

    const candidates = await this.buildCandidateContext(config.max_weekly_hours);
    if (candidates.length === 0) return 'No available employees found with remaining capacity.';

    const context = this.buildSkillMatchContext(input, candidates, config.max_weekly_hours);
    return this.callWithFallback(
      () => LLMFactory.create(config.llm_provider, config.llm_api_key).skillMatch(context),
      this.fallbackSkillMatch(candidates, input.required_skills),
    );
  }

  // ── Risk Summary ────────────────────────────────────────────────────────────

  async riskSummary(projectId: number): Promise<string> {
    const config = await this.configRepo.getAll();
    if (!config.llm_api_key) throw new ConfigurationError('LLM API key not configured. Go to System Configuration.');

    const riskCtx = await this.buildProjectRiskContext(projectId, config.max_weekly_hours);
    const context = this.buildRiskSummaryContext(riskCtx);
    return this.callWithFallback(
      () => LLMFactory.create(config.llm_provider, config.llm_api_key).riskSummary(context),
      this.fallbackRiskSummary(riskCtx),
    );
  }

  // ── Team Match from free-form prompt ────────────────────────────────────────

  async teamMatchFromPrompt(managerPrompt: string): Promise<TeamMatchResult> {
    const config = await this.configRepo.getAll();
    if (!config.llm_api_key) throw new ConfigurationError('LLM API key not configured. Go to System Configuration.');

    // Step 1: LLM extracts structured requirements from natural language
    const llm       = LLMFactory.create(config.llm_provider, config.llm_api_key);
    const rawJson   = await llm.extractTeamRequirements(managerPrompt);

    // Strip markdown fences if LLM wrapped the JSON
    const cleaned = rawJson.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();

    let parsed: TeamMatchInput;
    try {
      parsed = JSON.parse(cleaned) as TeamMatchInput;
    } catch {
      throw new ValidationError(
        'Could not parse team requirements from your input. ' +
        'Please be more specific, e.g. "I need a Senior Java Developer and a DevOps Engineer with Docker."'
      );
    }

    if (!parsed.roles || parsed.roles.length === 0) {
      throw new ValidationError(
        'No roles found in your description. ' +
        'Please mention specific positions, e.g. "React Developer", "QA Engineer".'
      );
    }

    // Step 2: deterministic greedy matching (same as structured flow)
    return this.teamMatch(parsed);
  }

  // ── Team Match ──────────────────────────────────────────────────────────────

  async teamMatch(input: TeamMatchInput): Promise<TeamMatchResult> {
    const config = await this.configRepo.getAll();
    if (!config.llm_api_key) throw new ConfigurationError('LLM API key not configured. Go to System Configuration.');

    // 1. Build enriched pool — all active employees in DB (any role)
    const allEmployees = await this.employeeRepo.findAllWithDetails();
    const pool: PoolEntry[] = [];

    for (const emp of allEmployees) {
      if (!emp.is_active) continue;
      const activeAllocs = await this.allocationRepo.findActiveByEmployeeId(emp.id);
      const usedPct      = activeAllocs.reduce((s, a) => s + a.utilisation_pct, 0);
      const freePct      = Math.max(0, 100 - usedPct);

      const latestEnd = activeAllocs.length > 0
        ? activeAllocs
            .map(a => toDateStr(a.to_date))
            .sort()
            .reverse()[0]
        : null;

      pool.push({
        id:            emp.id,
        name:          emp.full_name,
        department:    emp.department_name ?? 'Unknown',
        free_pct:      freePct,
        free_hours_pw: Math.round((freePct / 100) * config.max_weekly_hours * 10) / 10,
        skills:        emp.skills ?? [],
        latest_end:    latestEnd,
      });
    }

    // 2. Greedy single-pass assignment
    const assigned = new Set<number>();
    const filled:   FilledRole[]   = [];
    const unfilled: UnfilledRole[] = [];

    for (const role of input.roles) {
      const available = pool.filter(c => !assigned.has(c.id) && c.free_pct > 0);
      const scored    = available.map(c => scoreCandidate(c, role));
      const qualified = scored
        .filter(s => role.required_skills.length === 0 || s.matchCount > 0)
        .sort((a, b) => {
          // Tier 1: exact match (all skills covered) always beats partial match
          const aExact = a.missing.length === 0 ? 1 : 0;
          const bExact = b.missing.length === 0 ? 1 : 0;
          if (aExact !== bExact) return bExact - aExact;
          // Tier 2: more skills matched wins
          if (a.matchCount !== b.matchCount) return b.matchCount - a.matchCount;
          // Tier 3: higher availability wins
          return b.c.free_pct - a.c.free_pct;
        });

      if (qualified.length > 0) {
        const best = qualified[0];
        assigned.add(best.c.id);
        filled.push({
          role_name:       role.role_name,
          required_skills: role.required_skills,
          assigned: {
            name:           best.c.name,
            department:     best.c.department,
            free_pct:       best.c.free_pct,
            free_hours_pw:  best.c.free_hours_pw,
            matched_skills: best.matched,
            missing_skills: best.missing,
            all_skills:     best.c.skills.map(s => `${s.skill_name} (${s.proficiency})`).join(', ') || 'None recorded',
          },
        });
      } else {
        unfilled.push(analyzeGap(role, pool));
      }
    }

    // 3. Build LLM context & get narrative
    const context   = buildTeamMatchContext(input, filled, unfilled);
    const narrative = await this.callWithFallback(
      () => LLMFactory.create(config.llm_provider, config.llm_api_key).teamMatch(context),
      fallbackTeamNarrative(filled, unfilled),
    );

    return { filled, unfilled, narrative };
  }

  // ── DB query helpers ─────────────────────────────────────────────────────────

  async buildCandidateContext(maxWeeklyHours: number): Promise<CandidateContext[]> {
    const team = await this.employeeRepo.findAllWithDetails();
    const candidates: CandidateContext[] = [];

    for (const emp of team) {
      if (!emp.is_active) continue;
      const activeAllocs = await this.allocationRepo.findActiveByEmployeeId(emp.id);
      const usedPct      = activeAllocs.reduce((s, a) => s + a.utilisation_pct, 0);
      const freePct      = 100 - usedPct;
      if (freePct <= 0) continue;

      candidates.push({
        name:          emp.full_name,
        department:    emp.department_name ?? 'Unknown',
        status:        emp.status          ?? 'BENCH',
        free_pct:      freePct,
        free_hours_pw: Math.round((freePct / 100) * maxWeeklyHours * 10) / 10,
        skills:        (emp.skills ?? [])
          .map((s: { skill_name: string; proficiency: string }) => `${s.skill_name} (${s.proficiency})`)
          .join(', ') || 'No skills recorded',
      });
    }

    return candidates;
  }

  async buildProjectRiskContext(projectId: number, maxWeeklyHours: number): Promise<ProjectRiskContext> {
    const project = await this.projectRepo.findById(projectId);
    if (!project) throw new NotFoundError('Project not found');

    const milestones  = await this.projectRepo.getMilestones(projectId);
    const allocations = await this.allocationRepo.findByProjectId(projectId);
    const today       = new Date().toISOString().split('T')[0];
    const lastMonday  = getLastMonday();

    const doneSP       = milestones.filter(m => m.status === 'DONE').reduce((s, m) => s + m.story_points, 0);
    const overdueCount = milestones.filter(m => m.status !== 'DONE' && toDateStr(m.due_date) < today).length;

    const milestoneLines = milestones.map(m => {
      const overdue = m.status !== 'DONE' && toDateStr(m.due_date) < today;
      return `  ${m.title} | Due: ${toDateStr(m.due_date)} | ${m.story_points} SP | ${m.status}${overdue ? ' [OVERDUE]' : ''}`;
    }).join('\n') || '  No milestones defined';

    const allocationLines = allocations.map(a =>
      `  ${a.employee_name} — ${a.utilisation_pct}% (${Math.round(a.utilisation_pct / 100 * maxWeeklyHours)}h/wk)`
    ).join('\n') || '  No active allocations';

    const effortLines: string[] = [];
    for (const alloc of allocations) {
      const ts       = await this.timesheetRepo.findByEmployeeAndWeek(alloc.employee_id, lastMonday);
      const expected = Math.round((alloc.utilisation_pct / 100) * maxWeeklyHours);
      const logged   = ts?.total_hours ?? 0;
      effortLines.push(`  ${alloc.employee_name}: expected ${expected}h, logged ${logged}h`);
    }

    return {
      project_name:     project.name,
      status:           project.status,
      end_date:         toDateStr(project.end_date),
      total_sp:         project.total_story_points,
      done_sp:          doneSP,
      overdue_count:    overdueCount,
      milestones:       milestoneLines,
      allocations:      allocationLines,
      last_week_effort: effortLines.join('\n') || '  No effort data',
    };
  }

  // ── Context builders ─────────────────────────────────────────────────────────

  buildSkillMatchContext(input: SkillMatchInput, candidates: CandidateContext[], maxWeeklyHours: number): string {
    const toEntry = (c: CandidateContext) => ({
      name:                c.name,
      department:          c.department,
      status:              c.status,
      free_pct:            c.free_pct,
      free_hours_per_week: c.free_hours_pw,
      skills:              c.skills,
    });

    const payload = {
      request: {
        required_skills:     input.required_skills,
        project_description: input.project_description ?? null,
        max_weekly_hours:    maxWeeklyHours,
      },
      fully_available:     candidates.filter(c => c.free_pct >= 80).map(toEntry),
      partially_available: candidates.filter(c => c.free_pct > 0 && c.free_pct < 80).map(toEntry),
    };
    return JSON.stringify(payload, null, 2);
  }

  buildRiskSummaryContext(ctx: ProjectRiskContext): string {
    const pct = ctx.total_sp > 0 ? Math.round((ctx.done_sp / ctx.total_sp) * 100) : 0;
    const payload = {
      project: {
        name:                    ctx.project_name,
        status:                  ctx.status,
        end_date:                ctx.end_date,
        total_story_points:      ctx.total_sp,
        completed_story_points:  ctx.done_sp,
        completion_pct:          pct,
        overdue_milestone_count: ctx.overdue_count,
      },
      milestones:          ctx.milestones,
      allocated_resources: ctx.allocations,
      last_week_effort:    ctx.last_week_effort,
    };
    return JSON.stringify(payload, null, 2);
  }

  // ── Fallbacks ─────────────────────────────────────────────────────────────────

  private fallbackSkillMatch(candidates: CandidateContext[], skills: string[]): string {
    const lowerSkills = skills.map(s => s.toLowerCase());
    const ranked = candidates
      .map(c => {
        const matchCount = lowerSkills.filter(s => c.skills.toLowerCase().includes(s)).length;
        return { ...c, matchCount };
      })
      .filter(c => c.matchCount > 0)
      .sort((a, b) => b.matchCount - a.matchCount || b.free_pct - a.free_pct);

    if (ranked.length === 0) {
      return `[Fallback — LLM unavailable]\nNo candidates with matching skills found for: ${skills.join(', ')}`;
    }

    const lines = ranked.map((c, i) =>
      `${i + 1}. ${c.name} — ${c.matchCount}/${skills.length} skills matched | ` +
      `${c.free_pct}% free (${c.free_hours_pw}h/wk) | Skills: ${c.skills}`
    );
    return `[Fallback — LLM unavailable]\n\nBest matches for: ${skills.join(', ')}\n\n${lines.join('\n')}`;
  }

  private fallbackRiskSummary(ctx: ProjectRiskContext): string {
    const pct   = ctx.total_sp > 0 ? Math.round((ctx.done_sp / ctx.total_sp) * 100) : 0;
    const level = ctx.overdue_count > 0 ? 'AT RISK' : pct < 30 ? 'ATTENTION' : 'ON TRACK';
    return (
      `[Fallback — LLM unavailable]\n\n` +
      `Project "${ctx.project_name}" is currently ${level}. ` +
      `${pct}% of story points complete (${ctx.done_sp}/${ctx.total_sp}). ` +
      (ctx.overdue_count > 0
        ? `${ctx.overdue_count} milestone(s) are overdue. Immediate review recommended.`
        : `No overdue milestones. Monitor progress as end date ${ctx.end_date} approaches.`)
    );
  }

  // ── LLM wrapper ──────────────────────────────────────────────────────────────

  private async callWithFallback(llmCall: () => Promise<string>, fallback: string): Promise<string> {
    try {
      return await llmCall();
    } catch {
      return fallback;
    }
  }
}

// ── Pure functions (no this dependency) ──────────────────────────────────────

function profRank(p: string | undefined): number {
  switch ((p ?? '').toUpperCase()) {
    case 'EXPERT':       return 4;
    case 'ADVANCED':     return 3;
    case 'INTERMEDIATE': return 2;
    default:             return 1;
  }
}

function scoreCandidate(c: PoolEntry, role: RoleRequirement) {
  const matched: string[] = [];
  const missing: string[] = [];

  for (const req of role.required_skills) {
    const empSkill = c.skills.find(
      s => s.skill_name.toLowerCase() === req.skill.toLowerCase()
    );
    if (empSkill && profRank(empSkill.proficiency) >= profRank(req.min_proficiency)) {
      matched.push(`${empSkill.skill_name} (${empSkill.proficiency})`);
    } else {
      missing.push(req.skill);
    }
  }

  const matchPct = role.required_skills.length > 0
    ? (matched.length / role.required_skills.length) * 100
    : 100;

  // Primary: skill coverage (0–100). Tiebreaker: availability (0–10 bonus).
  const score = matchPct + c.free_pct * 0.1;
  return { c, matched, missing, score, matchCount: matched.length };
}

function analyzeGap(role: RoleRequirement, pool: PoolEntry[]): UnfilledRole {
  const noSkillFor: string[]                         = [];
  const allocatedMap = new Map<number, GapCandidate>();

  for (const req of role.required_skills) {
    const withSkill = pool.filter(c =>
      c.skills.some(
        s => s.skill_name.toLowerCase() === req.skill.toLowerCase() &&
             profRank(s.proficiency) >= profRank(req.min_proficiency)
      )
    );

    if (withSkill.length === 0) {
      noSkillFor.push(
        req.min_proficiency ? `${req.skill} (${req.min_proficiency}+)` : req.skill
      );
    } else {
      // Has the skill but fully booked
      for (const c of withSkill) {
        if (c.free_pct === 0 && !allocatedMap.has(c.id)) {
          allocatedMap.set(c.id, {
            name:      c.name,
            free_date: c.latest_end ?? 'unknown date',
          });
        }
      }
    }
  }

  // If EVERY required skill is missing from the whole team → no-skill gap
  // Otherwise at least one skill exists but everyone is booked → allocated gap
  const gap_type: 'NO_SKILL_IN_TEAM' | 'ALL_ALLOCATED' =
    noSkillFor.length === role.required_skills.length ? 'NO_SKILL_IN_TEAM' : 'ALL_ALLOCATED';

  return {
    role_name:             role.role_name,
    required_skills:       role.required_skills,
    gap_type,
    missing_skills:        noSkillFor,
    candidates_with_skill: Array.from(allocatedMap.values()),
  };
}

function buildTeamMatchContext(
  input:    TeamMatchInput,
  filled:   FilledRole[],
  unfilled: UnfilledRole[],
): string {
  const payload = {
    project: {
      name:        input.project_name        ?? null,
      description: input.project_description ?? null,
    },
    filled_roles: filled.map(f => ({
      role:            f.role_name,
      required_skills: f.required_skills.map(s =>
        s.min_proficiency ? `${s.skill}:${s.min_proficiency}` : s.skill
      ),
      assigned_to:     f.assigned.name,
      department:      f.assigned.department,
      availability:    `${f.assigned.free_pct}% free (${f.assigned.free_hours_pw}h/wk)`,
      matched_skills:  f.assigned.matched_skills,
      missing_skills:  f.assigned.missing_skills,
    })),
    unfilled_roles: unfilled.map(u => ({
      role:                  u.role_name,
      required_skills:       u.required_skills.map(s =>
        s.min_proficiency ? `${s.skill}:${s.min_proficiency}` : s.skill
      ),
      gap_type:              u.gap_type,
      missing_skills:        u.missing_skills,
      candidates_with_skill: u.candidates_with_skill,
    })),
  };
  return JSON.stringify(payload, null, 2);
}

function fallbackTeamNarrative(filled: FilledRole[], unfilled: UnfilledRole[]): string {
  const lines: string[] = ['[Fallback — LLM unavailable]\n'];

  if (filled.length > 0) {
    lines.push('STAFFED ROLES:');
    for (const f of filled) {
      lines.push(
        `  ${f.role_name} → ${f.assigned.name}` +
        ` (${f.assigned.matched_skills.length}/${f.required_skills.length} skills matched,` +
        ` ${f.assigned.free_pct}% free)`
      );
      if (f.assigned.missing_skills.length > 0) {
        lines.push(`    Gap: ${f.assigned.missing_skills.join(', ')}`);
      }
    }
  }

  if (unfilled.length > 0) {
    lines.push('\nGAPS — ACTION REQUIRED:');
    for (const u of unfilled) {
      if (u.gap_type === 'NO_SKILL_IN_TEAM') {
        lines.push(
          `  ${u.role_name}: Nobody has ${u.missing_skills.join(', ')}.` +
          ` → Hire externally or initiate training.`
        );
      } else {
        const names = u.candidates_with_skill
          .map(c => `${c.name} (free from ${c.free_date})`)
          .join(', ');
        lines.push(
          `  ${u.role_name}: Skill exists but all candidates are booked — ${names || 'no details'}.` +
          ` → Align timeline or hire a contractor.`
        );
      }
    }
  }

  return lines.join('\n');
}

function toDateStr(d: Date | string): string {
  return d instanceof Date ? d.toISOString().split('T')[0] : String(d).slice(0, 10);
}

function getLastMonday(): string {
  const now       = new Date();
  const dayOfWeek = now.getDay();
  const daysBack  = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday    = new Date(now);
  monday.setDate(now.getDate() - daysBack - 7);
  return monday.toISOString().split('T')[0];
}
