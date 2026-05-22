import type { MessageParam } from '@anthropic-ai/sdk/resources/messages.js';
import type { LLMClient } from '../llm/index.js';

// Compact a conversation when token budget approaches the limit.
// Summarises full message history via the active LLM client,
// then replaces it with a single user turn containing the summary.
export async function compactMessages(
  messages: MessageParam[],
  client: LLMClient,
): Promise<MessageParam[]> {
  if (messages.length <= 2) return messages;

  const historyText = messages
    .map((m) => {
      const role = m.role.toUpperCase();
      const content =
        typeof m.content === 'string'
          ? m.content
          : Array.isArray(m.content)
            ? m.content
                .map((b) => {
                  if (typeof b === 'object' && 'text' in b) return (b as { text: string }).text;
                  if (
                    typeof b === 'object' &&
                    'type' in b &&
                    (b as { type: string }).type === 'tool_result'
                  ) {
                    const tr = b as { content?: Array<{ text: string }> | string };
                    if (typeof tr.content === 'string') return tr.content;
                    if (Array.isArray(tr.content)) return tr.content.map((c) => c.text).join(' ');
                  }
                  return '[tool_use]';
                })
                .join(' ')
            : '';
      return `${role}: ${content}`;
    })
    .join('\n\n');

  const summary = await client.summarize({
    model: process.env['ANIMA_MODEL'] ?? 'claude-sonnet-4-6',
    max_tokens: 1024,
    prompt: `Summarise the following agent conversation history into a concise paragraph (max 300 words). Preserve: what decisions were made, what tools were called, what outcomes were produced, and what is still pending. This summary will replace the full history to stay within token limits.\n\n${historyText}`,
  });

  return [{ role: 'user', content: `[COMPACTED HISTORY] ${summary}` }];
}
