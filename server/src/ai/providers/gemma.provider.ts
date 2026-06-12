import { ILLMProvider } from '../interfaces/ILLMProvider';
import { ENV } from '../../config/env';

export class GemmaProvider implements ILLMProvider {
  private readonly apiKey: string;
  private readonly apiUrl = ENV.GEMMA_API_URL;
  private readonly model  = ENV.GEMMA_MODEL;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async skillMatch(context: string): Promise<string> {
    const prompt = [
      `You are a resource planning assistant for an IT services company.`,
      ``,
      `HARD RULES — violating any rule makes your response invalid:`,
      `  1. The JSON below contains "request", "fully_available", and "partially_available" arrays.`,
      `     The grouping is already done — do NOT move any candidate between groups.`,
      `  2. Only use data from the JSON. Do NOT invent names, skills, or percentages.`,
      `  3. Within each array, rank candidates by how many "required_skills" appear in their`,
      `     "skills" string (case-insensitive), descending. Break ties by higher "free_pct".`,
      `  4. Omit a candidate from output only if they match zero required skills.`,
      `  5. If "fully_available" has no skill matches, write "No fully available candidates match the required skills."`,
      `  6. Omit the "ALSO AVAILABLE" section entirely if "partially_available" has no skill matches.`,
      `  7. If both arrays have no matches at all, say "No matching candidates found." and stop.`,
      `  8. Output format — use exactly this structure, nothing else:`,
      ``,
      `       RECOMMENDED RESOURCES`,
      `       [Rank]. [Name] — [X/Y skills matched]`,
      `       Availability: [free_pct]% free ([free_hours_per_week]h/week)`,
      `       Skills: [skills]`,
      `       Reason: [1-2 sentences based only on the data]`,
      ``,
      `       ALSO AVAILABLE (partial capacity)`,
      `       [Name] — [X/Y skills matched] | [free_pct]% available ([free_hours_per_week]h/week)`,
      `       Skills: [skills]`,
      `       Note: [1 sentence on what they can contribute given their limited availability]`,
      ``,
      `DATA:`,
      context,
    ].join('\n');
    return this.call(prompt);
  }

  async riskSummary(context: string): Promise<string> {
    const prompt = [
      `You are a project health analyst for an IT services company.`,
      ``,
      `HARD RULES — violating any rule makes your response invalid:`,
      `  1. Read the JSON block below. It contains project metadata, milestones, resource allocations, and last-week effort.`,
      `  2. Only use data that exists in the JSON. Do NOT invent milestones, people, or dates.`,
      `  3. Determine the risk level using ONLY these rules:`,
      `       - CRITICAL  : overdue_milestone_count >= 2  OR  completion_pct < 20`,
      `       - AT RISK   : overdue_milestone_count == 1  OR  completion_pct < 50`,
      `       - ATTENTION : completion_pct < 75 with end_date within 60 days`,
      `       - ON TRACK  : none of the above`,
      `  4. Identify effort gaps: any resource whose logged hours < 80% of expected hours last week is under-performing.`,
      `  5. Output format (plain English, 4-6 sentences, no bullet points):`,
      `       First sentence: state the project name and risk level.`,
      `       Second sentence: state completion percentage and overdue milestones.`,
      `       Third sentence: name any under-performing resources and the gap.`,
      `       Fourth sentence: state the most urgent recommended action.`,
      `       Optional fifth/sixth: any other observations strictly from the data.`,
      ``,
      `DATA:`,
      context,
    ].join('\n');
    return this.call(prompt);
  }

  async extractTeamRequirements(prompt: string): Promise<string> {
    const instruction = [
      `You are a requirements parser for a resource planning system.`,
      `Extract team staffing requirements from the manager's input.`,
      ``,
      `HARD RULES:`,
      `  1. Output ONLY valid JSON. No markdown fences, no explanation, nothing else.`,
      `  2. JSON must follow this exact structure:`,
      `     {`,
      `       "project_name": "string or null",`,
      `       "project_description": "string or null",`,
      `       "roles": [`,
      `         {`,
      `           "role_name": "string",`,
      `           "required_skills": [`,
      `             { "skill": "string", "min_proficiency": "BEGINNER|INTERMEDIATE|ADVANCED|EXPERT" }`,
      `           ]`,
      `         }`,
      `       ]`,
      `     }`,
      `  3. Infer min_proficiency from language:`,
      `       "junior" or "basic"     → BEGINNER`,
      `       "mid" or no qualifier   → INTERMEDIATE`,
      `       "senior" or "lead"      → ADVANCED`,
      `       "expert" or "principal" → EXPERT`,
      `  4. If no proficiency implied, use INTERMEDIATE.`,
      `  5. Extract every role and every skill mentioned. Do not omit anything.`,
      `  6. If no roles found, return { "project_name": null, "project_description": null, "roles": [] }.`,
      ``,
      `MANAGER INPUT:`,
      prompt,
    ].join('\n');
    return this.call(instruction);
  }

  async teamMatch(context: string): Promise<string> {
    const prompt = [
      `You are a staffing analyst for an IT services company.`,
      ``,
      `HARD RULES — violating any rule makes your response invalid:`,
      `  1. The JSON below contains "filled_roles" and "unfilled_roles".`,
      `     You MUST NOT change who is assigned to which role.`,
      `  2. Only use data from the JSON. Do NOT invent people, skills, or dates.`,
      `  3. Output format — use exactly this structure, nothing else:`,
      ``,
      `       TEAM STAFFING REPORT — [project.name or "New Project"]`,
      ``,
      `       ✓ STAFFED ROLES`,
      `       [Role Name] → [assigned_to] ([X/Y skills matched] | [availability])`,
      `       [1 sentence: why this person fits based on matched_skills and availability]`,
      `       [If missing_skills is non-empty: "Gap: [skill list] — consider cross-training or pairing."]`,
      ``,
      `       ✗ GAPS — ACTION REQUIRED`,
      `       For gap_type NO_SKILL_IN_TEAM:`,
      `         [Role Name]: No one in the current team has [missing_skills].`,
      `         ACTION: Hire externally or initiate training before project kick-off.`,
      `       For gap_type ALL_ALLOCATED:`,
      `         [Role Name]: [candidate names] have the required skills but are booked until [free_date].`,
      `         ACTION: Align project timeline with their availability, or bring in a contractor.`,
      ``,
      `  4. Omit the "✗ GAPS" section entirely if unfilled_roles is empty.`,
      `  5. If filled_roles is empty, write "No roles could be staffed from the current bench." and stop.`,
      `  6. Do not add any section, sentence, or word beyond the format above.`,
      ``,
      `DATA:`,
      context,
    ].join('\n');
    return this.call(prompt);
  }

  private async call(prompt: string): Promise<string> {
    const response = await fetch(this.apiUrl, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey':       this.apiKey,
      },
      body: JSON.stringify({
        model:  this.model,
        prompt,
        stream: false,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Gemma API error: ${response.status} — ${err}`);
    }

    const data = await response.json() as { response?: string };
    return data.response?.trim() ?? 'No response from AI.';
  }
}
