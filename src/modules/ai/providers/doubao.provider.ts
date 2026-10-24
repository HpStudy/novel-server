import { Injectable } from '@nestjs/common';
import { OpenAiCompatibleProvider } from './openai-compatible.provider';

/**
 * 火山方舟（Doubao / Ark）使用 OpenAI 兼容协议，
 * 默认 API Base 由 AiSettingsService 解析为 https://ark.cn-beijing.volces.com/api/v3。
 */
@Injectable()
export class DoubaoProvider extends OpenAiCompatibleProvider {
  readonly name = 'doubao';
}
