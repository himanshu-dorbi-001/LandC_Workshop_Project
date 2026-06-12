import { ILLMProvider } from './interfaces/ILLMProvider';
import { GeminiProvider } from './providers/gemini.provider';
import { GroqProvider }   from './providers/groq.provider';
import { GemmaProvider }  from './providers/gemma.provider';
import { LLMProvider }    from '../models/interfaces/SystemConfig';

export class LLMFactory {
  static create(provider: LLMProvider, apiKey: string): ILLMProvider {
    switch (provider) {
      case 'gemini': return new GeminiProvider(apiKey);
      case 'groq':   return new GroqProvider(apiKey);
      case 'gemma':  return new GemmaProvider(apiKey);
      default:       throw new Error(`Unknown LLM provider: ${provider}`);
    }
  }
}
