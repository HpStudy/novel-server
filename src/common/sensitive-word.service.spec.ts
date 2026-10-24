import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SensitiveWordService } from './sensitive-word.service';

const createService = (words?: string) =>
  new SensitiveWordService({
    get: jest.fn(() => words),
  } as unknown as ConfigService);

describe('SensitiveWordService', () => {
  it('passes all content when no words are configured', () => {
    const service = createService();
    expect(service.find('任意内容')).toBeUndefined();
    expect(() => service.assertClean('任意内容')).not.toThrow();
  });

  it('matches configured words case-insensitively', () => {
    const service = createService('bad, word；spam');
    expect(service.find('This is BAD content')).toBe('bad');
    expect(service.find('a clean sentence')).toBeUndefined();
  });

  it('rejects content containing a configured word', () => {
    const service = createService('spam');
    expect(() => service.assertClean('buy spam now')).toThrow(
      BadRequestException,
    );
  });
});
