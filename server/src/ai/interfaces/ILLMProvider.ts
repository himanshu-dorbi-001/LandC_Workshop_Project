export interface ILLMProvider {
  skillMatch(context: string): Promise<string>;
  riskSummary(context: string): Promise<string>;
  teamMatch(context: string): Promise<string>;
  extractTeamRequirements(prompt: string): Promise<string>;
}
