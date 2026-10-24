import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Response } from 'express';
import { RedisService } from '../../common/redis.service';
import { SensitiveWordService } from '../../common/sensitive-word.service';
import { AiConversation } from '../../entities/ai/ai-conversation.entity';
import { AiKnowledgeChunk } from '../../entities/ai/ai-knowledge-chunk.entity';
import { AiKnowledgeDoc } from '../../entities/ai/ai-knowledge-doc.entity';
import { AiMessage } from '../../entities/ai/ai-message.entity';
import {
  buildGeneralPrompt,
  buildKnowledgePrompt,
  buildSystemPrompt,
} from './ai-prompts';
import { AiSseService } from './ai-sse.service';
import { AiSettingsService } from './ai-settings.service';
import { AiConversationService } from './conversation.service';
import { EmbeddingService } from './embedding.service';
import { LlmService } from './llm.service';
import { VectorService } from './vector.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);

  constructor(
    private readonly conversations: AiConversationService,
    private readonly settings: AiSettingsService,
    private readonly embedding: EmbeddingService,
    private readonly vector: VectorService,
    private readonly llm: LlmService,
    private readonly redis: RedisService,
    private readonly sensitiveWords: SensitiveWordService,
    private readonly sse: AiSseService,
    @InjectRepository(AiMessage)
    private readonly messages: Repository<AiMessage>,
    @InjectRepository(AiKnowledgeChunk)
    private readonly chunks: Repository<AiKnowledgeChunk>,
    @InjectRepository(AiKnowledgeDoc)
    private readonly docs: Repository<AiKnowledgeDoc>,
  ) {}

  async chat(
    userId: number,
    input: { conversationId: number; content: string; clientMsgId: string },
    response: Response,
    signal: AbortSignal,
  ) {
    this.sse.start(response);
    let conversation: AiConversation | undefined;
    let userMessage: AiMessage | undefined;
    let fullContent = '';
    const startedAt = Date.now();
    try {
      conversation = await this.conversations.ownedConversation(
        input.conversationId,
        userId,
      );
      const idempotencyKey = `ai:message:${conversation.id}:${userId}:${input.clientMsgId}`;
      const claimed = await this.redis.claim(idempotencyKey, 600);
      if (!claimed) {
        const existing = await this.messages.findOne({
          where: {
            conversationId: conversation.id,
            role: 'user',
            clientMsgId: input.clientMsgId,
          },
        });
        const reply = existing
          ? await this.messages
              .createQueryBuilder('message')
              .where('message.conversationId = :conversationId', {
                conversationId: conversation.id,
              })
              .andWhere('message.role = :role', { role: 'assistant' })
              .andWhere(
                "JSON_UNQUOTE(JSON_EXTRACT(message.meta, '$.replyToMessageId')) = :messageId",
                { messageId: String(existing.id) },
              )
              .getOne()
          : null;
        if (reply) {
          this.sse.send(response, 'done', {
            messageId: reply.id,
            fullContent: reply.content,
            citations: reply.meta?.citations ?? [],
          });
        } else if (conversation.status === 1 || conversation.status === 2) {
          this.sendTransferEvent(response, conversation.status);
        } else if (conversation.status === 3) {
          this.sse.send(response, 'error', {
            message: '会话已结束，请创建新会话',
            code: 'CONVERSATION_CLOSED',
          });
        } else {
          this.sse.send(response, 'error', {
            message: '该消息正在处理中，请稍后重试',
            code: 'DUPLICATE_IN_PROGRESS',
          });
        }
        return;
      }

      if (conversation.status === 3) {
        await this.redis.delete(idempotencyKey);
        this.sse.send(response, 'error', {
          message: '会话已结束，请创建新会话',
          code: 'CONVERSATION_CLOSED',
        });
        return;
      }

      const content = input.content?.trim() ?? '';
      if (!content) {
        await this.redis.delete(idempotencyKey);
        this.sse.send(response, 'error', {
          message: '消息内容不能为空',
          code: 'EMPTY_CONTENT',
        });
        return;
      }

      if (this.sensitiveWords.find(content)) {
        await this.redis.delete(idempotencyKey);
        this.sse.send(response, 'error', {
          message: '内容包含敏感词，请修改后重试',
          code: 'SENSITIVE_CONTENT',
        });
        return;
      }

      // 转人工 / 人工接管后仍需把用户消息落库，供客服在后台查看并回复。
      userMessage = await this.saveUserMessage(
        conversation,
        content,
        input.clientMsgId,
      );
      await this.conversations.touch(conversation);

      if (conversation.status === 1 || conversation.status === 2) {
        this.sendTransferEvent(response, conversation.status);
        return;
      }

      const config = await this.settings.getAll();
      const embedding = await this.embedding.embed(content, signal);
      const configuredTopK = Number(config.topK);
      const topK = Number.isFinite(configuredTopK)
        ? Math.min(50, Math.max(1, Math.floor(configuredTopK)))
        : 5;
      const candidates = await this.vector.search(embedding, topK);
      const configuredThreshold = Number(config.similarityThreshold);
      const threshold = Number.isFinite(configuredThreshold)
        ? configuredThreshold
        : 0.5;
      const matches = candidates.filter(
        (candidate) => candidate.similarity >= threshold,
      );
      const chunkIds = matches.map((match) => match.id);
      const sqlChunks = chunkIds.length
        ? await this.chunks
            .createQueryBuilder('chunk')
            .innerJoin(
              AiKnowledgeDoc,
              'doc',
              'doc.id = chunk.docId AND doc.status = :status',
              { status: 2 },
            )
            .select('chunk.vectorId', 'vectorId')
            .addSelect('doc.id', 'docId')
            .addSelect('doc.title', 'title')
            .addSelect('chunk.chunkIndex', 'chunkIndex')
            .where('chunk.vectorId IN (:...chunkIds)', { chunkIds })
            .getRawMany<{
              vectorId: string;
              docId: string | number;
              title: string;
              chunkIndex: number;
            }>()
        : [];
      const chunkByVectorId = new Map(
        sqlChunks.map((row) => [
          row.vectorId,
          { title: row.title, chunkIndex: Number(row.chunkIndex) },
        ]),
      );
      const citations = matches
        .map((match) => ({
          docId: match.docId,
          title: chunkByVectorId.get(match.id)?.title ?? '',
          chunkIndex:
            chunkByVectorId.get(match.id)?.chunkIndex ?? match.chunkIndex,
        }))
        .filter((citation) => citation.title);
      const context = matches
        .filter((match) => chunkByVectorId.has(match.id))
        .map((match, index) => {
          const citation = chunkByVectorId.get(match.id);
          if (!citation) {
            return '';
          }
          return `[来源${index + 1}] ${citation.title} / 切片${citation.chunkIndex}\n${match.content}`;
        })
        .filter(Boolean)
        .join('\n\n');
      const systemPrompt = buildSystemPrompt(
        config.systemPrompt,
        Boolean(context),
      );
      const generationSignal = AbortSignal.any([
        signal,
        AbortSignal.timeout(
          Math.max(1, Number(config.sseTimeoutSec) || 60) * 1000,
        ),
      ]);
      const prompt = context
        ? buildKnowledgePrompt(context, content)
        : buildGeneralPrompt(content);
      const model = config.llmModel;
      const citationsEnabled = config.enableCitation === 'true';
      let completionError: unknown;
      const assistantMessage = await this.messages.save(
        this.messages.create({
          conversationId: conversation.id,
          role: 'assistant',
          content: '',
          meta: { replyToMessageId: userMessage.id, pending: true },
        }),
      );
      try {
        for await (const chunk of this.llm.streamChat(
          [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt },
          ],
          generationSignal,
        )) {
          fullContent += chunk.content;
          this.sse.send(response, 'message', {
            messageId: assistantMessage.id,
            content: chunk.content,
            done: false,
          });
        }
      } catch (error) {
        completionError = error;
        fullContent = config.noHitFallback;
        this.logger.error(
          `AI generation failed for conversation ${conversation.id}`,
        );
        this.sse.send(response, 'message', {
          messageId: assistantMessage.id,
          content: fullContent,
          done: false,
        });
      }
      if (!fullContent && !signal.aborted) {
        completionError = completionError ? completionError : 'empty-content';
        fullContent = config.noHitFallback;
        this.sse.send(response, 'message', {
          messageId: assistantMessage.id,
          content: fullContent,
          done: false,
        });
      }

      assistantMessage.content = fullContent;
      assistantMessage.meta = {
        citations: citationsEnabled ? citations : [],
        durationMs: Date.now() - startedAt,
        model,
        replyToMessageId: userMessage.id,
        failed: Boolean(completionError),
      };
      await this.messages.save(assistantMessage);
      await this.conversations.touch(conversation);
      this.sse.send(response, 'done', {
        messageId: assistantMessage.id,
        fullContent,
        citations: citationsEnabled ? citations : [],
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'AI 客服服务暂不可用';
      if (conversation && userMessage) {
        const fallback = await this.settings.get('noHitFallback');
        try {
          const fallbackMessage = await this.conversations.addMessage(
            conversation.id,
            'assistant',
            fallback,
            {
              meta: {
                citations: [],
                durationMs: Date.now() - startedAt,
                failed: true,
                replyToMessageId: userMessage.id,
              },
            },
          );
          this.sse.send(response, 'message', {
            messageId: fallbackMessage.id,
            content: fallback,
            done: false,
          });
          this.sse.send(response, 'done', {
            messageId: fallbackMessage.id,
            fullContent: fallback,
            citations: [],
          });
        } catch {
          this.logger.error('Failed to persist AI fallback response');
          this.sse.send(response, 'error', {
            message: errorMessage,
            code:
              error instanceof ServiceUnavailableException
                ? 'AI_UNAVAILABLE'
                : 'AI_ERROR',
          });
        }
      } else {
        this.sse.send(response, 'error', {
          message: errorMessage,
          code:
            error instanceof ServiceUnavailableException
              ? 'AI_UNAVAILABLE'
              : 'AI_ERROR',
        });
      }
    } finally {
      this.sse.close(response);
    }
  }

  private sendTransferEvent(response: Response, status: number) {
    this.sse.send(response, 'transfer', {
      status,
      message:
        status === 1 ? '已为你转接人工客服，请稍候' : '人工客服已接管会话',
    });
  }

  private async saveUserMessage(
    conversation: AiConversation,
    content: string,
    clientMsgId: string,
  ): Promise<AiMessage> {
    if (clientMsgId) {
      const existing = await this.messages.findOne({
        where: { conversationId: conversation.id, clientMsgId },
      });
      if (existing) {
        return existing;
      }
    }
    try {
      return await this.conversations.addMessage(
        conversation.id,
        'user',
        content,
        { clientMsgId },
      );
    } catch (error) {
      if (this.isDuplicateKeyError(error)) {
        const existing = await this.messages.findOne({
          where: { conversationId: conversation.id, clientMsgId },
        });
        if (existing) {
          return existing;
        }
      }
      throw error;
    }
  }

  private isDuplicateKeyError(error: unknown): boolean {
    return Boolean(
      error &&
      typeof error === 'object' &&
      (error as { code?: string }).code === 'ER_DUP_ENTRY',
    );
  }
}
