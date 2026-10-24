import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: RedisClientType;

  constructor(config: ConfigService) {
    const url = config.get<string>('REDIS_URL');
    this.client = createClient({
      url:
        url ??
        `redis://${config.get<string>('REDIS_HOST', '127.0.0.1')}:${config.get<number>('REDIS_PORT', 6379)}`,
      password: config.get<string>('REDIS_PASSWORD') || undefined,
    });
    this.client.on('error', (error) =>
      this.logger.error(`Redis client error: ${error.message}`),
    );
  }

  async onModuleInit() {
    await this.client.connect();
  }

  async onModuleDestroy() {
    if (this.client.isOpen) {
      await this.client.quit();
    }
  }

  async claim(key: string, ttlSeconds: number): Promise<boolean> {
    const result = await this.client.set(key, '1', {
      NX: true,
      EX: ttlSeconds,
    });
    return result === 'OK';
  }

  async allowSlidingWindow(
    key: string,
    limit: number,
    windowMs: number,
  ): Promise<boolean> {
    const now = Date.now();
    const member = `${now}:${Math.random().toString(36).slice(2)}`;
    const result = await this.client.eval(
      `
        redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', ARGV[1])
        local count = redis.call('ZCARD', KEYS[1])
        if count >= tonumber(ARGV[2]) then
          return 0
        end
        redis.call('ZADD', KEYS[1], ARGV[3], ARGV[4])
        redis.call('PEXPIRE', KEYS[1], ARGV[5])
        return 1
      `,
      {
        keys: [key],
        arguments: [
          String(now - windowMs),
          String(limit),
          String(now),
          member,
          String(windowMs),
        ],
      },
    );
    return Number(result) === 1;
  }

  async exists(key: string): Promise<boolean> {
    return (await this.client.exists(key)) === 1;
  }

  async get<T>(key: string): Promise<T | null> {
    const value = await this.client.get(key);
    return value == null ? null : (JSON.parse(value) as T);
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    await this.client.set(key, JSON.stringify(value), { EX: ttlSeconds });
  }

  async delete(key: string): Promise<void> {
    await this.client.del(key);
  }

  async deleteByPrefix(prefix: string): Promise<void> {
    const keys: string[] = [];
    for await (const key of this.client.scanIterator({
      MATCH: `${prefix}*`,
      COUNT: 100,
    })) {
      keys.push(key);
      if (keys.length >= 500) {
        await this.client.del(keys.splice(0, keys.length));
      }
    }
    if (keys.length) {
      await this.client.del(keys);
    }
  }

  async increment(key: string, ttlSeconds: number): Promise<number> {
    const result = await this.client.incr(key);
    if (result === 1) {
      await this.client.expire(key, ttlSeconds);
    }
    return result;
  }

  async assertAvailable() {
    try {
      await this.client.ping();
    } catch {
      throw new ServiceUnavailableException('Redis 服务暂不可用');
    }
  }
}
