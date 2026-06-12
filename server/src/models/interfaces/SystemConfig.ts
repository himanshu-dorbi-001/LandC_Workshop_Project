export type LLMProvider = 'gemini' | 'groq' | 'gemma';

export interface SystemConfig {
  id:                     number;
  updated_by_employee_id: number | null;
  config_key:             string;
  config_value:           string;
  updated_at:             Date;
}

export interface SystemConfigMap {
  llm_provider:       LLMProvider;
  llm_api_key:        string;
  scheduler_interval: number;
  max_weekly_hours:   number;
}

export interface UpdateConfigDTO {
  llm_provider?:       LLMProvider;
  llm_api_key?:        string;
  scheduler_interval?: number;
  max_weekly_hours?:   number;
}
