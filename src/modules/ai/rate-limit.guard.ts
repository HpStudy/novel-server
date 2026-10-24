import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { RedisService } from '../../common/redis.service';
import { AiSseService } from './ai-sse.service';
import { AiSettingsService } from './ai-settings.service';
import { AiConversationService } from './conversation.service';
import { AI_RATE_LIMIT_KEY, AiRateLimitOptions } from './rate-limit.decorator';

const rateLimitWindowMs = 60 * 1000;

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly redis: RedisService,
    private readonly settings: AiSettingsService,
    private readonly conversations: AiConversationService,
    private readonly sse: AiSseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.getAllAndOverride<AiRateLimitOptions>(
      AI_RATE_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!options) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: { id: number } }>();
    const response = context.switchToHttp().getResponse<Response>();
    const userId = request.user?.id;
    if (!userId) {
      return true;
    }

    const body = (request.body ?? {}) as {
      conversationId?: number | string;
      clientMsgId?: string;
    };
    const conversationId = Number(body.conversationId);
    const clientMsgId = String(body.clientMsgId ?? '');
    const hasConversation =
      Number.isInteger(conversationId) && conversationId > 0;

    // 幂等重放不占用限流额度，避免客户端重试被误伤。
    if (hasConversation && clientMsgId) {
      try {
        const replayed = await this.redis.exists(
          `ai:message:${conversationId}:${userId}:${clientMsgId}`,
        );
        if (replayed) {
          return true;
        }
      } catch (error) {
        this.logger.warn(`Redis idempotency check failed: ${String(error)}`);
      }
    }

    let limit = options.limit;
    if (options.scope === 'ai-chat') {
      limit = Math.max(
        1,
        Number(await this.settings.get('rateLimitPerMinute')) || options.limit,
      );
    }

    let allowed = true;
    try {
      allowed = await this.redis.allowSlidingWindow(
        `ai:rate:${options.scope}:${userId}`,
        limit,
        rateLimitWindowMs,
      );
    } catch (error) {
      // Redis 异常时放行，避免限流组件故障导致整个客服不可用。
      this.logger.error(`AI rate limit check failed: ${String(error)}`);
      return true;
    }
    if (allowed) {
      return true;
    }

    if (hasConversation) {
      try {
        const conversation = await this.conversations.ownedConversation(
          conversationId,
          userId,
        );
        await this.conversations.addMessage(
          conversation.id,
          'system',
          'AI 客服请求频率超限',
          { meta: { code: 'RATE_LIMITED', scope: options.scope } },
        );
      } catch {
        this.logger.warn(
          `Unable to persist rate limit notice for conversation ${conversationId}`,
        );
      }
    }

    if (this.isStreamRequest(request)) {
      this.sse.start(response);
      this.sse.send(response, 'error', {
        message: '发送过于频繁，请稍后再试',
        code: 'RATE_LIMITED',
      });
      this.sse.close(response);
      return false;
    }

    throw new HttpException(
      { code: 'RATE_LIMITED', message: '发送过于频繁，请稍后再试' },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  private isStreamRequest(request: Request): boolean {
    const accept = String(request.headers.accept ?? '');
    return (
      accept.includes('text/event-stream') ||
      String(request.path ?? '').endsWith('/chat')
    );
  }
}
