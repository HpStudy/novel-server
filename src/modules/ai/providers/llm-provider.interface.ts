export interface ChatMessage {
  role: string;
  content: string;
}

export interface ChatChunk {
  content: string;
}

export interface ChatConfig {
  apiKey: string;
  apiBase: string;
  model: string;
  timeoutMs: number;
}

export interface EmbeddingConfig {
  apiKey: string;
  apiBase: string;
  model: string;
  timeoutMs: number;
  dimensions: number;
}

export interface ProviderConfig {
  provider: string;
  chat: ChatConfig;
  embedding: EmbeddingConfig;
}

export interface LLMProvider {
  readonly name: string;

  streamChat(
    messages: ChatMessage[],
    config: ChatConfig,
    signal: AbortSignal,
  ): AsyncGenerator<ChatChunk>;

  generate(
    messages: ChatMessage[],
    config: ChatConfig,
    signal?: AbortSignal,
  ): Promise<string>;
}

export interface EmbeddingProvider {
  readonly name: string;

  embed(
    text: string,
    config: EmbeddingConfig,
    signal?: AbortSignal,
  ): Promise<number[]>;
}

export interface AiProvider extends LLMProvider, EmbeddingProvider {}
