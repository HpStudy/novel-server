import { Injectable } from '@nestjs/common';
import { OpenAiCompatibleProvider } from './openai-compatible.provider';

/**
 * 智谱（Zhipu / BigModel）使用 OpenAI 兼容协议，
 * 默认 API Base 由 AiSettingsService 解析为 https://open.bigmodel.cn/api/paas/v4。
 */
@Injectable()
export class ZhipuProvider extends OpenAiCompatibleProvider {
  readonly name = 'zhipu';
}
