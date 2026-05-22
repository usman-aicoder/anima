import OpenAI from 'openai';
import type { Tool, MessageParam } from '@anthropic-ai/sdk/resources/messages.js';
import type { LLMClient, LLMResponse, NormalizedBlock } from './types.js';

// ─── Format converters ────────────────────────────────────────────────────────

function toOpenAITools(tools: Tool[]): OpenAI.ChatCompletionTool[] {
  return tools.map((t) => ({
    type: 'function' as const,
    function: {
      name: t.name,
      ...(t.description !== undefined ? { description: t.description } : {}),
      parameters: t.input_schema as Record<string, unknown>,
    },
  }));
}

function toOpenAIMessages(messages: MessageParam[]): OpenAI.ChatCompletionMessageParam[] {
  const result: OpenAI.ChatCompletionMessageParam[] = [];

  for (const msg of messages) {
    // Simple string content
    if (typeof msg.content === 'string') {
      result.push({ role: msg.role as 'user' | 'assistant', content: msg.content });
      continue;
    }

    if (msg.role === 'assistant') {
      const textParts = msg.content.filter((b) => b.type === 'text') as Array<{ type: 'text'; text: string }>;
      const toolUseParts = msg.content.filter((b) => b.type === 'tool_use') as Array<{
        type: 'tool_use';
        id: string;
        name: string;
        input: unknown;
      }>;

      result.push({
        role: 'assistant',
        content: textParts.map((b) => b.text).join('') || null,
        ...(toolUseParts.length > 0
          ? {
              tool_calls: toolUseParts.map((b) => ({
                id: b.id,
                type: 'function' as const,
                function: { name: b.name, arguments: JSON.stringify(b.input) },
              })),
            }
          : {}),
      });
      continue;
    }

    if (msg.role === 'user') {
      // Tool results → individual role:tool messages
      const toolResults = msg.content.filter((b) => b.type === 'tool_result') as Array<{
        type: 'tool_result';
        tool_use_id: string;
        content?: string | Array<{ type: string; text: string }>;
      }>;

      for (const tr of toolResults) {
        let content = '';
        if (typeof tr.content === 'string') {
          content = tr.content;
        } else if (Array.isArray(tr.content)) {
          content = tr.content
            .filter((b) => b.type === 'text')
            .map((b) => b.text)
            .join('');
        }
        result.push({ role: 'tool', tool_call_id: tr.tool_use_id, content });
      }

      // Remaining text blocks → user message
      const textParts = msg.content.filter((b) => b.type === 'text') as Array<{ type: 'text'; text: string }>;
      if (textParts.length > 0) {
        result.push({ role: 'user', content: textParts.map((b) => b.text).join('') });
      }
    }
  }

  return result;
}

// ─── Client ───────────────────────────────────────────────────────────────────

export class OllamaLLMClient implements LLMClient {
  private readonly client: OpenAI;

  constructor() {
    const baseURL = (process.env['OLLAMA_BASE_URL'] ?? 'http://localhost:11434') + '/v1';
    this.client = new OpenAI({ baseURL, apiKey: 'ollama' });
  }

  async complete(params: {
    model: string;
    max_tokens: number;
    system: string;
    tools: Tool[];
    messages: MessageParam[];
  }): Promise<LLMResponse> {
    const systemMessage: OpenAI.ChatCompletionMessageParam = { role: 'system', content: params.system };
    const converted = toOpenAIMessages(params.messages);
    const tools = toOpenAITools(params.tools);

    const response = await this.client.chat.completions.create({
      model: params.model,
      max_tokens: params.max_tokens,
      messages: [systemMessage, ...converted],
      ...(tools.length > 0 ? { tools, tool_choice: 'auto' } : {}),
    });

    const choice = response.choices[0];
    if (choice === undefined) throw new Error('Ollama returned no choices');

    const content: NormalizedBlock[] = [];
    if (choice.message.content) {
      content.push({ type: 'text', text: choice.message.content });
    }
    for (const tc of choice.message.tool_calls ?? []) {
      content.push({
        type: 'tool_use',
        id: tc.id,
        name: tc.function.name,
        input: JSON.parse(tc.function.arguments) as Record<string, unknown>,
      });
    }

    const stop_reason =
      choice.finish_reason === 'tool_calls' ? 'tool_use'
      : choice.finish_reason === 'length' ? 'max_tokens'
      : 'end_turn';

    return {
      stop_reason,
      content,
      usage: {
        input_tokens: response.usage?.prompt_tokens ?? 0,
        output_tokens: response.usage?.completion_tokens ?? 0,
      },
    };
  }

  async summarize(params: { model: string; max_tokens: number; prompt: string }): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: params.model,
      max_tokens: params.max_tokens,
      messages: [{ role: 'user', content: params.prompt }],
    });
    return response.choices[0]?.message.content ?? 'Previous conversation history compacted.';
  }
}
