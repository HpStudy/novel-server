import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  Allow,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import {
  buildGeneralPrompt,
  buildKnowledgePrompt,
  buildSystemPrompt,
} from './ai-prompts';
import { AiConversationService } from './conversation.service';
import { KnowledgeService } from './knowledge.service';
import { AiSettingsService } from './ai-settings.service';
import { EmbeddingService } from './embedding.service';
import { VectorService } from './vector.service';
import { LlmService } from './llm.service';
import { RateLimit } from './rate-limit.decorator';
import { RateLimitGuard } from './rate-limit.guard';

class ReplyDto {
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  content: string;
}

class CreateKnowledgeDto {
  @IsString()
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  fileUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  url?: string;

  @IsInt()
  @IsIn([1, 2, 3])
  sourceType: number;
}

class UpdateKnowledgeDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  fileUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  url?: string;
}

class TestQuestionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  question: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  topK?: number;
}

class UpdateAiSettingsDto {
  @Allow() @IsOptional() llmProvider?: string;
  @Allow() @IsOptional() llmModel?: string;
  @Allow() @IsOptional() llmApiKey?: string;
  @Allow() @IsOptional() embeddingModel?: string;
  @Allow() @IsOptional() embeddingDimensions?: string | number;
  @Allow() @IsOptional() systemPrompt?: string;
  @Allow() @IsOptional() welcomeMessage?: string;
  @Allow() @IsOptional() topK?: string | number;
  @Allow() @IsOptional() similarityThreshold?: string | number;
  @Allow() @IsOptional() enableCitation?: string | boolean;
  @Allow() @IsOptional() noHitFallback?: string;
  @Allow() @IsOptional() allowUserTransfer?: string | boolean;
  @Allow() @IsOptional() rateLimitPerMinute?: string | number;
  @Allow() @IsOptional() sseTimeoutSec?: string | number;
}

@Controller('api/admin/ai')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AiAdminController {
  constructor(
    private readonly conversations: AiConversationService,
    private readonly knowledge: KnowledgeService,
    private readonly settings: AiSettingsService,
    private readonly embedding: EmbeddingService,
    private readonly vector: VectorService,
    private readonly llm: LlmService,
  ) {}

  @Get('conversations')
  listConversations(
    @Query('status') status?: string,
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string,
    @Query('keyword') keyword?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const statusValue = status === undefined ? undefined : Number(status);
    if (
      statusValue !== undefined &&
      (!Number.isInteger(statusValue) || statusValue < 0 || statusValue > 3)
    ) {
      throw new BadRequestException('status 参数无效');
    }
    return this.conversations.adminList({
      status: statusValue,
      startTime,
      endTime,
      keyword,
      page: this.pageValue(page, 1),
      pageSize: this.pageValue(pageSize, 20),
    });
  }

  @Get('conversations/:id')
  conversation(@Param('id', ParseIntPipe) id: number) {
    return this.conversations.adminDetail(id);
  }

  @Get('conversations/:id/messages')
  messages(
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.conversations.adminMessages(
      id,
      this.pageValue(page, 1),
      this.pageValue(pageSize, 100),
    );
  }

  @Post('conversations/:id/take-over')
  takeOver(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: { id: number } },
  ) {
    return this.conversations.takeOver(id, req.user.id);
  }

  @Post('conversations/:id/reply')
  reply(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: { id: number } },
    @Body() body: ReplyDto,
  ) {
    return this.conversations.agentReply(id, req.user.id, body.content);
  }

  @Post('conversations/:id/close')
  close(@Param('id', ParseIntPipe) id: number) {
    return this.conversations.adminClose(id);
  }

  @Get('stats')
  stats() {
    return this.conversations.stats();
  }

  @Get('knowledge')
  knowledgeList(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('keyword') keyword?: string,
  ) {
    return this.knowledge.list(
      this.pageValue(page, 1),
      this.pageValue(pageSize, 20),
      keyword,
    );
  }

  @Post('knowledge')
  createKnowledge(@Body() body: CreateKnowledgeDto) {
    return this.knowledge.create(body);
  }

  @Post('knowledge/:id/parse')
  parseKnowledge(@Param('id', ParseIntPipe) id: number) {
    return this.knowledge.enqueueParse(id);
  }

  @Put('knowledge/:id')
  updateKnowledge(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateKnowledgeDto,
  ) {
    return this.knowledge.update(id, body);
  }

  @Delete('knowledge/:id')
  deleteKnowledge(@Param('id', ParseIntPipe) id: number) {
    return this.knowledge.delete(id);
  }

  @Get('knowledge/:id/chunks')
  knowledgeChunks(@Param('id', ParseIntPipe) id: number) {
    return this.knowledge.chunks(id);
  }

  @Get('settings')
  settingsList() {
    return this.settings.getPublic();
  }

  @Put('settings')
  updateSettings(@Body() body: UpdateAiSettingsDto) {
    const input = Object.fromEntries(
      Object.entries(body)
        .filter(([, value]) => value !== undefined && value !== null)
        .map(([key, value]) => [key, String(value)]),
    );
    return this.settings.update(input);
  }

  @Post('test')
  @UseGuards(RateLimitGuard)
  @RateLimit('ai-test', 20)
  async testQuestion(@Body() body: TestQuestionDto) {
    const config = await this.settings.getAll();
    const vector = await this.embedding.embed(body.question);
    const topK = Math.min(
      Math.max((body.topK ?? Number(config.topK)) || 5, 1),
      50,
    );
    const candidates = await this.vector.search(vector, topK);
    const threshold = Number(config.similarityThreshold);
    const matches = candidates.filter(
      (candidate) => candidate.similarity >= threshold,
    );
    const chunks = matches.length
      ? await this.knowledgeChunksFor(matches.map((match) => match.id))
      : [];
    const chunkMap = new Map(chunks.map((chunk) => [chunk.vectorId, chunk]));
    const hits = matches.flatMap((match) => {
      const chunk = chunkMap.get(match.id);
      return chunk
        ? [
            {
              docId: chunk.docId,
              title: chunk.title,
              chunkIndex: chunk.chunkIndex,
              content: match.content,
              similarity: match.similarity,
            },
          ]
        : [];
    });
    const citations = hits.map((hit) => ({
      docId: hit.docId,
      title: hit.title,
      chunkIndex: hit.chunkIndex,
      similarity: hit.similarity,
    }));
    const context = hits
      .map(
        (hit, index) =>
          `[来源${index + 1}] ${hit.title} / 切片${hit.chunkIndex}\n${hit.content}`,
      )
      .join('\n\n');
    const hasContext = Boolean(context);
    const answer = await this.llm.generate([
      {
        role: 'system',
        content: buildSystemPrompt(config.systemPrompt, hasContext),
      },
      {
        role: 'user',
        content: hasContext
          ? buildKnowledgePrompt(context, body.question)
          : buildGeneralPrompt(body.question),
      },
    ]);
    return { answer, citations, matches: hits };
  }

  private async knowledgeChunksFor(vectorIds: string[]) {
    return this.knowledge.lookupChunks(vectorIds);
  }

  private pageValue(value: string | undefined, fallback: number) {
    const parsed = Number(value ?? fallback);
    return Number.isInteger(parsed) && parsed > 0
      ? Math.min(parsed, 100)
      : fallback;
  }
}
