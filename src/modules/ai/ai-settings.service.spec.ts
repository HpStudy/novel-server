import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { AiSetting } from '../../entities/ai/ai-setting.entity';
import { AiSettingsService } from './ai-settings.service';

describe('AiSettingsService', () => {
  const configValues: Record<string, string> = {
    LLM_PROVIDER: 'doubao',
    LLM_MODEL: 'doubao-model',
    LLM_TIMEOUT_MS: '15000',
    DOUBAO_API_BASE: 'https://ark.example.com/api/v3',
    DOUBAO_API_KEY: 'doubao-key',
    ZHIPU_API_BASE: 'https://zhipu.example.com/api/paas/v4',
    ZHIPU_API_KEY: 'zhipu-key',
  };
  const config = {
    get: jest.fn((key: string) => configValues[key]),
  } as unknown as ConfigService;
  let repository: Repository<AiSetting>;
  let service: AiSettingsService;

  beforeEach(() => {
    repository = {
      find: jest.fn().mockResolvedValue([]),
      upsert: jest.fn().mockResolvedValue(undefined),
    } as unknown as Repository<AiSetting>;
    service = new AiSettingsService(repository, config);
  });

  it('resolves provider, api base, key and timeout from environment', async () => {
    const result = await service.getProviderConfig();

    expect(result.provider).toBe('doubao');
    expect(result.chat.apiBase).toBe('https://ark.example.com/api/v3');
    expect(result.chat.apiKey).toBe('doubao-key');
    expect(result.chat.model).toBe('doubao-model');
    expect(result.chat.timeoutMs).toBe(15000);
    expect(result.embedding.apiBase).toBe('https://ark.example.com/api/v3');
    expect(result.embedding.timeoutMs).toBe(10000);
  });

  it('prefers persisted settings over environment values', async () => {
    (repository.find as jest.Mock).mockResolvedValue([
      { settingKey: 'llmProvider', settingValue: 'zhipu' },
      { settingKey: 'llmApiKey', settingValue: 'db-key' },
      { settingKey: 'llmModel', settingValue: 'glm-4-flash' },
    ]);

    const result = await service.getProviderConfig();

    expect(result.provider).toBe('zhipu');
    expect(result.chat.apiBase).toBe('https://zhipu.example.com/api/paas/v4');
    expect(result.chat.apiKey).toBe('db-key');
    expect(result.chat.model).toBe('glm-4-flash');
  });

  it('caches settings between reads and refreshes after update', async () => {
    await service.getProviderConfig();
    await service.getProviderConfig();
    expect(repository.find).toHaveBeenCalledTimes(1);

    await service.update({ llmModel: 'doubao-model-2' });
    await service.getProviderConfig();
    expect(repository.find).toHaveBeenCalledTimes(2);
    expect(repository.upsert).toHaveBeenCalledWith(
      [{ settingKey: 'llmModel', settingValue: 'doubao-model-2' }],
      ['settingKey'],
    );
  });

  it('rejects unsupported providers', async () => {
    await expect(
      service.update({ llmProvider: 'unknown' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('does not expose the removed idle auto transfer setting', async () => {
    const result = await service.getPublic();

    expect(result).not.toHaveProperty('idleTransferMinutes');
  });
});
