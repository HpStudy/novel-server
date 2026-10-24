import { Injectable } from '@nestjs/common';
import { DoubaoProvider } from './doubao.provider';
import { AiProvider } from './llm-provider.interface';
import { OpenAIProvider } from './openai.provider';
import { ZhipuProvider } from './zhipu.provider';

@Injectable()
export class AiProviderRegistry {
  private readonly providers: Map<string, AiProvider>;

  constructor(
    openai: OpenAIProvider,
    doubao: DoubaoProvider,
    zhipu: ZhipuProvider,
  ) {
    this.providers = new Map<string, AiProvider>([
      [openai.name, openai],
      [doubao.name, doubao],
      [zhipu.name, zhipu],
    ]);
  }

  resolve(name: string): AiProvider {
    return (
      this.providers.get(String(name).toLowerCase()) ??
      this.providers.get('openai')!
    );
  }
}
