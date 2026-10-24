import { Injectable } from '@nestjs/common';
import { OpenAiCompatibleProvider } from './openai-compatible.provider';

@Injectable()
export class OpenAIProvider extends OpenAiCompatibleProvider {
  readonly name = 'openai';
}
