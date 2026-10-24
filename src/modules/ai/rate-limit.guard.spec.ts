import { ExecutionContext, HttpException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { RedisService } from '../../common/redis.service';
import { AiSseService } from './ai-sse.service';
import { AiSettingsService } from './ai-settings.service';
import { AiConversationService } from './conversation.service';
import { RateLimitGuard } from './rate-limit.guard';

describe('RateLimitGuard', () => {
  let guard: RateLimitGuard;
  let reflector: Reflector;
  let redis: { exists: jest.Mock; allowSlidingWindow: jest.Mock };
  let settings: { get: jest.Mock };
  let conversations: { ownedConversation: jest.Mock; addMessage: jest.Mock };
  let request: Request & { user: { id: number } };
  let response: {
    headersSent: boolean;
    writableEnded: boolean;
    destroyed: boolean;
    status: jest.Mock;
    setHeader: jest.Mock;
    flushHeaders: jest.Mock;
    write: jest.Mock;
    end: jest.Mock;
  };
  let context: ExecutionContext;

  const createContext = () =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn().mockReturnValue({
        scope: 'ai-chat',
        limit: 10,
      }),
    } as unknown as Reflector;
    redis = {
      exists: jest.fn().mockResolvedValue(false),
      allowSlidingWindow: jest.fn().mockResolvedValue(true),
    };
    settings = { get: jest.fn().mockResolvedValue('10') };
    conversations = {
      ownedConversation: jest.fn().mockResolvedValue({ id: 5 }),
      addMessage: jest.fn().mockResolvedValue({ id: 1 }),
    };
    request = {
      user: { id: 1 },
      body: { conversationId: 5, clientMsgId: 'client-1' },
      headers: { accept: 'text/event-stream' },
      path: '/api/ai/chat',
    } as unknown as Request & { user: { id: number } };
    response = {
      headersSent: false,
      writableEnded: false,
      destroyed: false,
      status: jest.fn().mockReturnThis(),
      setHeader: jest.fn(),
      flushHeaders: jest.fn(),
      write: jest.fn(),
      end: jest.fn(),
    };
    context = createContext();
    guard = new RateLimitGuard(
      reflector,
      redis as unknown as RedisService,
      settings as unknown as AiSettingsService,
      conversations as unknown as AiConversationService,
      new AiSseService(),
    );
  });

  it('allows requests within the sliding window', async () => {
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(redis.allowSlidingWindow).toHaveBeenCalledWith(
      'ai:rate:ai-chat:1',
      10,
      60000,
    );
  });

  it('does not consume quota for idempotent replays', async () => {
    redis.exists.mockResolvedValue(true);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(redis.allowSlidingWindow).not.toHaveBeenCalled();
  });

  it('emits an SSE error event and records a system message when limited', async () => {
    redis.allowSlidingWindow.mockResolvedValue(false);

    await expect(guard.canActivate(context)).resolves.toBe(false);

    expect(conversations.addMessage).toHaveBeenCalledWith(
      5,
      'system',
      'AI 客服请求频率超限',
      expect.objectContaining({
        meta: expect.objectContaining({ code: 'RATE_LIMITED' }),
      }),
    );
    const payload = String(response.write.mock.calls[0][0]);
    expect(payload).toContain('event: error');
    expect(payload).toContain('RATE_LIMITED');
    expect(response.end).toHaveBeenCalled();
  });

  it('throws 429 for non-stream endpoints when limited', async () => {
    reflector.getAllAndOverride = jest.fn().mockReturnValue({
      scope: 'ai-test',
      limit: 20,
    });
    redis.allowSlidingWindow.mockResolvedValue(false);
    request = {
      user: { id: 1 },
      body: { question: 'hello' },
      headers: { accept: 'application/json' },
      path: '/api/admin/ai/test',
    } as unknown as Request & { user: { id: number } };

    try {
      await guard.canActivate(context);
      throw new Error('Expected guard to reject the request');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(429);
    }
    expect(response.write).not.toHaveBeenCalled();
  });
});
