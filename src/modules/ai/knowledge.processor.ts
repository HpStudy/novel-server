import { Logger } from '@nestjs/common';
import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { KnowledgeService } from './knowledge.service';

@Processor('ai-knowledge')
export class KnowledgeProcessor {
  private readonly logger = new Logger(KnowledgeProcessor.name);

  constructor(private readonly knowledge: KnowledgeService) {}

  @Process({ name: 'parse', concurrency: 2 })
  async parse(job: Job<{ docId: number }>) {
    try {
      await this.knowledge.parseDocument(job.data.docId);
    } catch (error) {
      this.logger.error(`Knowledge parse job ${job.id} failed`);
      throw error;
    }
  }
}
