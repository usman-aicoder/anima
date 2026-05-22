export type { LLMClient, LLMResponse, NormalizedBlock, NormalizedTextBlock, NormalizedToolUseBlock, MessageParam, Tool } from './types.js';
export { AnthropicLLMClient } from './anthropic-client.js';
export { OllamaLLMClient } from './ollama-client.js';

import type { LLMClient } from './types.js';
import { AnthropicLLMClient } from './anthropic-client.js';
import { OllamaLLMClient } from './ollama-client.js';

export function createLLMClient(): LLMClient {
  const provider = process.env['ANIMA_PROVIDER'] ?? 'anthropic';
  if (provider === 'ollama') return new OllamaLLMClient();
  return new AnthropicLLMClient();
}
