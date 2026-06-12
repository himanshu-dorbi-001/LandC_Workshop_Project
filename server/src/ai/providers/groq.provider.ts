import { ILLMProvider } from '../interfaces/ILLMProvider';

export class GroqProvider implements ILLMProvider {
  private readonly apiKey: string;
  private readonly apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
  private readonly model  = 'llama3-8b-8192';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async skillMatch(context: string): Promise<string> {
    return this.call(
      'You are a resource planning assistant for an IT services company. ' +
      'Suggest the best matching employees based on the data. Return a ranked list with brief reasons.',
      context
    );
  }

  async riskSummary(context: string): Promise<string> {
    return this.call(
      'You are a project health analyst. Write a brief plain-English risk summary (3-5 sentences). ' +
      'Highlight what is at risk and what action is needed. Only use provided data.',
      context
    );
  }

  async extractTeamRequirements(prompt: string): Promise<string> {
    return this.call(
      `You are a requirements parser. Extract team staffing requirements and return ONLY valid JSON with no markdown.
Structure: { "project_name": string|null, "project_description": string|null, "roles": [{ "role_name": string, "required_skills": [{ "skill": string, "min_proficiency": "BEGINNER|INTERMEDIATE|ADVANCED|EXPERT" }] }] }
Infer proficiency from context. If no qualifier, use INTERMEDIATE. Output only raw JSON.`,
      prompt
    );
  }

  async teamMatch(context: string): Promise<string> {
    return this.call(
      'You are a staffing analyst. The JSON contains filled_roles and unfilled_roles from a greedy team assignment. ' +
      'Do NOT change assignments. Write a staffing report: for filled roles explain the fit; ' +
      'for unfilled roles with NO_SKILL_IN_TEAM recommend hiring/training, ' +
      'for ALL_ALLOCATED name the person and their free_date and suggest timeline planning. Only use provided data.',
      context
    );
  }

  private async call(systemPrompt: string, userContent: string): Promise<string> {
    const response = await fetch(this.apiUrl, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model:    this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: userContent  },
        ],
        temperature: 0.3,
        max_tokens:  512,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Groq API error: ${response.status} — ${err}`);
    }

    const data = await response.json() as {
      choices?: { message?: { content?: string } }[]
    };
    return data.choices?.[0]?.message?.content ?? 'No response from AI.';
  }
}
