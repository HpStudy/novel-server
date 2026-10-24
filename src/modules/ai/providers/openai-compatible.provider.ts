import { Logger, ServiceUnavailableException } from '@nestjs/common';
import {
  AiProvider,
  ChatChunk,
  ChatConfig,
  ChatMessage,
  EmbeddingConfig,
} from './llm-provider.interface';

/**
 * OpenAI 兼容协议的通用实现。
 * OpenAI / 火山方舟（Doubao）/ 智谱（Zhipu）的 Chat Completions 与
 * Embeddings 接口均遵循该协议，差异只在默认 apiBase、模型名与密钥。
 */
export abstract class OpenAiCompatibleProvider implements AiProvider {
  abstract readonly name: string;

  protected readonly logger = new Logger(this.constructor.name);

  async *streamChat(
    messages: ChatMessage[],
    config: ChatConfig,
    signal: AbortSignal,
  ): AsyncGenerator<ChatChunk> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
    const abort = () => controller.abort();
    signal.addEventListener('abort', abort, { once: true });
    try {
      const response = await fetch(
        `${config.apiBase.replace(/\/$/, '')}/chat/completions`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: config.model,
            messages,
            stream: true,
          }),
          signal: controller.signal,
        },
      );
      if (!response.ok || !response.body) {
        this.logger.error(
          `${this.name} LLM provider returned HTTP ${response.status}`,
        );
        throw new ServiceUnavailableException('AI 生成服务暂不可用');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        buffer += done
          ? decoder.decode()
          : decoder.decode(value, { stream: true });
        const lines = buffer.split(/\r?\n/);
        buffer = done ? '' : (lines.pop() ?? '');
        for (const line of lines) {
          const content = this.parseStreamLine(line);
          if (content) {
            yield { content };
          }
        }
        if (done) {
          break;
        }
      }
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }
      if (signal.aborted) {
        return;
      }
      this.logger.error(
        `${this.name} LLM streaming request failed: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
      throw new ServiceUnavailableException('AI 生成服务请求失败');
    } finally {
      clearTimeout(timeout);
      signal.removeEventListener('abort', abort);
    }
  }

  async generate(
    messages: ChatMessage[],
    config: ChatConfig,
    signal?: AbortSignal,
  ): Promise<string> {
    const chunks: string[] = [];
    for await (const chunk of this.streamChat(
      messages,
      config,
      signal ?? new AbortController().signal,
    )) {
      chunks.push(chunk.content);
    }
    return chunks.join('');
  }

  async embed(
    text: string,
    config: EmbeddingConfig,
    signal?: AbortSignal,
  ): Promise<number[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
    const abort = () => controller.abort();
    signal?.addEventListener('abort', abort, { once: true });
    try {
      const response = await fetch(
        `${config.apiBase.replace(/\/$/, '')}/embeddings`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: config.model,
            input: text,
            dimensions: config.dimensions,
          }),
          signal: controller.signal,
        },
      );
      if (!response.ok) {
        this.logger.error(
          `${this.name} embedding provider returned HTTP ${response.status}`,
        );
        throw new ServiceUnavailableException('Embedding 服务暂不可用');
      }
      const payload = (await response.json()) as {
        data?: Array<{ embedding?: number[] }>;
      };
      const embedding = payload.data?.[0]?.embedding;
      if (
        !embedding?.length ||
        embedding.some((value) => !Number.isFinite(value))
      ) {
        throw new ServiceUnavailableException('Embedding 服务返回了无效向量');
      }
      return embedding;
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }
      this.logger.error(
        `${this.name} embedding request failed: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
      throw new ServiceUnavailableException('Embedding 服务请求失败');
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', abort);
    }
  }

  private parseStreamLine(line: string): string | undefined {
    if (!line.startsWith('data:')) {
      return undefined;
    }
    const data = line.slice(5).trim();
    if (!data || data === '[DONE]') {
      return undefined;
    }
    try {
      const chunk = JSON.parse(data) as {
        choices?: Array<{ delta?: { content?: string } }>;
      };
      return chunk.choices?.[0]?.delta?.content;
    } catch {
      this.logger.warn(`Ignoring malformed ${this.name} stream chunk`);
      return undefined;
    }
  }
}
