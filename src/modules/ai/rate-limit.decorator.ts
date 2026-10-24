import { SetMetadata } from '@nestjs/common';

export const AI_RATE_LIMIT_KEY = 'ai-rate-limit';

export interface AiRateLimitOptions {
  scope: string;
  limit: number;
}

export const RateLimit = (scope: string, limit: number): MethodDecorator =>
  SetMetadata(AI_RATE_LIMIT_KEY, { scope, limit });
