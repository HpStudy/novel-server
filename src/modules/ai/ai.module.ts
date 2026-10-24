import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiConversation } from '../../entities/ai/ai-conversation.entity';
import { AiFeedback } from '../../entities/ai/ai-feedback.entity';
import { AiKnowledgeChunk } from '../../entities/ai/ai-knowledge-chunk.entity';
import { AiKnowledgeDoc } from '../../entities/ai/ai-knowledge-doc.entity';
import { AiMessage } from '../../entities/ai/ai-message.entity';
import { AiSetting } from '../../entities/ai/ai-setting.entity';
import { User } from '../../entities/user.entity';
import { VectorDataSource } from '../../datasources/vector.datasource';
import { AuthModule } from '../auth/auth.module';
import { AiAdminController } from './ai-admin.controller';
import { AiController } from './ai.controller';
import { AiConversationService } from './conversation.service';
import { EmbeddingService } from './embedding.service';
import { KnowledgeProcessor } from './knowledge.processor';
import { KnowledgeService } from './knowledge.service';
import { LlmService } from './llm.service';
import { RagService } from './rag.service';
import { VectorService } from './vector.service';
import { KnowledgeUploadController } from './knowledge-upload.controller';
import { AiSseService } from './ai-sse.service';
import { AiSettingsService } from './ai-settings.service';
import { RateLimitGuard } from './rate-limit.guard';
import { AiProviderRegistry } from './providers/ai-provider.registry';
import { DoubaoProvider } from './providers/doubao.provider';
import { OpenAIProvider } from './providers/openai.provider';
import { ZhipuProvider } from './providers/zhipu.provider';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([
      AiConversation,
      AiFeedback,
      AiKnowledgeChunk,
      AiKnowledgeDoc,
      AiMessage,
      AiSetting,
      User,
    ]),
    BullModule.registerQueue({ name: 'ai-knowledge' }),
  ],
  controllers: [AiController, AiAdminController, KnowledgeUploadController],
  providers: [
    AiConversationService,
    AiSettingsService,
    AiSseService,
    EmbeddingService,
    KnowledgeProcessor,
    KnowledgeService,
    LlmService,
    RagService,
    VectorDataSource,
    VectorService,
    OpenAIProvider,
    DoubaoProvider,
    ZhipuProvider,
    AiProviderRegistry,
    RateLimitGuard,
  ],
})
export class AiModule {}
