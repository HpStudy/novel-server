import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { AiSettingsService } from './ai-settings.service';
import { AiProviderRegistry } from './providers/ai-provider.registry';
import { ChatChunk, ChatMessage } from './providers/llm-provider.interface';

@Injectable()
export class LlmService {
  constructor(
    private readonly settings: AiSettingsService,
    private readonly providers: AiProviderRegistry,
  ) {}

  async *streamChat(
    messages: ChatMessage[],
    signal: AbortSignal,
  ): AsyncGenerator<ChatChunk> {
    const config = await this.settings.getProviderConfig();
    if (!config.chat.apiKey) {
      throw new ServiceUnavailableException('尚未配置 LLM API 密钥');
    }
    if (!config.chat.model) {
      throw new ServiceUnavailableException('尚未配置 LLM 模型');
    }
    const provider = this.providers.resolve(config.provider);
    yield* provider.streamChat(messages, config.chat, signal);
  }

  async generate(
    messages: ChatMessage[],
    signal?: AbortSignal,
  ): Promise<string> {
    const chunks: string[] = [];
    for await (const chunk of this.streamChat(
      messages,
      signal ?? new AbortController().signal,
    )) {
      chunks.push(chunk.content);
    }
    return chunks.join('');
  }
}
