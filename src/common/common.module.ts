import { Global, Module } from '@nestjs/common';
import { SensitiveWordService } from './sensitive-word.service';

@Global()
@Module({
  providers: [SensitiveWordService],
  exports: [SensitiveWordService],
})
export class CommonModule {}
