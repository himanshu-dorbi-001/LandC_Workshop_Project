import { ILLMProvider } from '../interfaces/ILLMProvider';

export class GeminiProvider implements ILLMProvider {
  private readonly apiKey: string;
  private readonly apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async skillMatch(context: string): Promise<string> {
    return this.call(this.buildSkillMatchPrompt(context));
  }

  async riskSummary(context: string): Promise<string> {
    return this.call(this.buildRiskSummaryPrompt(context));
  }

  async extractTeamRequirements(prompt: string): Promise<string> {
    return this.call(
      `You are a requirements parser. Extract team staffing requirements from the manager's input and return ONLY valid JSON.
Structure: { "project_name": string|null, "project_description": string|null, "roles": [{ "role_name": string, "required_skills": [{ "skill": string, "min_proficiency": "BEGINNER|INTERMEDIATE|ADVANCED|EXPERT" }] }] }
Infer proficiency: junior→BEGINNER, mid/none→INTERMEDIATE, senior/lead→ADVANCED, expert/principal→EXPERT.
Output only JSON, no markdown, no explanation.
Input: ${prompt}`
    );
  }

  async teamMatch(context: string): Promise<string> {
    return this.call(
      `You are a staffing analyst. The JSON below contains filled_roles and unfilled_roles from a greedy team assignment.
Do NOT change who is assigned. Write a team staffing report:
- For each filled role: one sentence on why the person fits and note any missing skills.
- For each unfilled role: state gap_type (NO_SKILL_IN_TEAM → recommend hiring/training; ALL_ALLOCATED → name the person and their free_date).
Only use data from the JSON.

${context}`
    );
  }

  private buildSkillMatchPrompt(context: string): string {
    return `You are a resource planning assistant for an IT services company.
Based on the following employee and requirement data, suggest the best matching employees.
Return a concise ranked list with name and a 1-2 sentence reason for each match.
Do not invent data — only use what is provided.

${context}`;
  }

  private buildRiskSummaryPrompt(context: string): string {
    return `You are a project health analyst for an IT services company.
Based on the following project data (milestones, effort, allocations), write a brief plain-English
risk summary paragraph (3-5 sentences). Highlight what is at risk, why, and what action is needed.
Do not invent data — only use what is provided.

${context}`;
  }

  private async call(prompt: string): Promise<string> {
    const response = await fetch(`${this.apiUrl}?key=${this.apiKey}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 512 },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Gemini API error: ${response.status} — ${err}`);
    }

    const data = await response.json() as {
      candidates?: { content?: { parts?: { text?: string }[] } }[]
    };
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? 'No response from AI.';
  }
}
