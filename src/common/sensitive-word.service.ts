import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * 轻量敏感词检查。词表通过 SENSITIVE_WORDS 环境变量配置
 * （逗号、分号或空白分隔），未配置时放行。
 *
 * 评论与 AI 客服共用该服务，避免各自维护一份词表。
 */
@Injectable()
export class SensitiveWordService {
  private readonly words: string[];

  constructor(config: ConfigService) {
    this.words = (config.get<string>('SENSITIVE_WORDS') ?? '')
      .split(/[,，;；\s]+/)
      .map((word) => word.trim().toLowerCase())
      .filter(Boolean);
  }

  find(text: string): string | undefined {
    if (!this.words.length) {
      return undefined;
    }
    const normalized = text.toLowerCase();
    return this.words.find((word) => normalized.includes(word));
  }

  assertClean(text: string): void {
    if (this.find(text)) {
      throw new BadRequestException('内容包含敏感词，请修改后重试');
    }
  }
}
