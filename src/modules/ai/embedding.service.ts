import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { AiSettingsService } from './ai-settings.service';
import { AiProviderRegistry } from './providers/ai-provider.registry';

@Injectable()
export class EmbeddingService {
  constructor(
    private readonly settings: AiSettingsService,
    private readonly providers: AiProviderRegistry,
  ) {}

  async embed(text: string, signal?: AbortSignal): Promise<number[]> {
    const config = await this.settings.getProviderConfig();
    if (!config.embedding.apiKey) {
      throw new ServiceUnavailableException('尚未配置 Embedding API 密钥');
    }
    if (!config.embedding.model) {
      throw new ServiceUnavailableException('尚未配置 Embedding 模型');
    }
    const provider = this.providers.resolve(config.provider);
    return provider.embed(text, config.embedding, signal);
  }
}
