import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { In, IsNull, MoreThanOrEqual } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RedisService } from '../../common/redis.service';
import { AiConversation } from '../../entities/ai/ai-conversation.entity';
import { AiFeedback } from '../../entities/ai/ai-feedback.entity';
import { AiMessage } from '../../entities/ai/ai-message.entity';
import { User } from '../../entities/user.entity';
import { AiSettingsService } from './ai-settings.service';

@Injectable()
export class AiConversationService {
  constructor(
    @InjectRepository(AiConversation)
    private readonly conversations: Repository<AiConversation>,
    @InjectRepository(AiMessage)
    private readonly messages: Repository<AiMessage>,
    @InjectRepository(AiFeedback)
    private readonly feedbacks: Repository<AiFeedback>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly settings: AiSettingsService,
    private readonly redis: RedisService,
  ) {}

  async create(userId: number, source = 'home') {
    const date = new Date();
    const datePart = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
    const sequence = await this.redis.increment(
      `ai:session-sequence:${datePart}`,
      3 * 24 * 60 * 60,
    );
    const conversation = await this.conversations.save(
      this.conversations.create({
        sessionNo: `AC${datePart}${String(sequence).padStart(4, '0')}`,
        userId,
        source,
        status: 0,
      }),
    );
    const welcomeMessage = await this.settings.get('welcomeMessage');
    return {
      conversationId: conversation.id,
      sessionNo: conversation.sessionNo,
      welcomeMessage,
      status: conversation.status,
    };
  }

  async ownedConversation(id: number, userId: number) {
    const conversation = await this.conversations.findOneBy({ id });
    if (!conversation) {
      throw new NotFoundException('会话不存在');
    }
    if (conversation.userId !== userId) {
      throw new ForbiddenException('无权访问该会话');
    }
    return conversation;
  }

  async get(id: number, userId: number) {
    return this.ownedConversation(id, userId);
  }

  async messagesForUser(
    id: number,
    userId: number,
    page: number,
    pageSize: number,
  ) {
    await this.ownedConversation(id, userId);
    const [list, total] = await this.messages.findAndCount({
      where: { conversationId: id },
      order: { id: 'ASC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { list, total, page, pageSize };
  }

  async addMessage(
    conversationId: number,
    role: string,
    content: string,
    values: { clientMsgId?: string; meta?: Record<string, unknown> } = {},
  ) {
    return this.messages.save(
      this.messages.create({
        conversationId,
        role,
        content,
        clientMsgId: values.clientMsgId,
        meta: values.meta,
      }),
    );
  }

  async touch(conversation: AiConversation) {
    conversation.lastMessageAt = new Date();
    return this.conversations.save(conversation);
  }

  async transfer(id: number, userId: number) {
    const conversation = await this.ownedConversation(id, userId);
    if (conversation.status === 3) {
      throw new ForbiddenException('会话已结束');
    }
    const allow = await this.settings.get('allowUserTransfer');
    if (allow !== 'true') {
      throw new ForbiddenException('当前暂不支持转人工');
    }
    if (conversation.status === 0) {
      conversation.status = 1;
      conversation.transferredBy = 'user';
      conversation.transferredAt = new Date();
      await this.conversations.save(conversation);
      await this.addMessage(conversation.id, 'system', '用户申请转人工', {
        meta: { action: 'user_transfer' },
      });
    }
    return { id: conversation.id, status: conversation.status };
  }

  async close(id: number, userId: number) {
    const conversation = await this.ownedConversation(id, userId);
    return this.closeConversation(conversation, '用户已结束会话');
  }

  async closeConversation(conversation: AiConversation, message: string) {
    if (conversation.status !== 3) {
      conversation.status = 3;
      conversation.endedAt = new Date();
      await this.conversations.save(conversation);
      await this.addMessage(conversation.id, 'system', message, {
        meta: { action: 'close' },
      });
    }
    return { id: conversation.id, status: conversation.status };
  }

  async feedback(
    messageId: number,
    userId: number,
    rating: number,
    comment?: string,
  ) {
    const message = await this.messages.findOneBy({ id: messageId });
    if (!message || message.role !== 'assistant') {
      throw new NotFoundException('AI 回复不存在');
    }
    await this.ownedConversation(message.conversationId, userId);
    const existing = await this.feedbacks.findOneBy({ messageId, userId });
    if (existing) {
      existing.rating = rating;
      existing.comment = comment;
      return this.feedbacks.save(existing);
    }
    const feedback = this.feedbacks.create({
      messageId,
      userId,
      rating,
      comment,
    });
    return this.feedbacks.save(feedback);
  }

  async adminList(input: {
    page: number;
    pageSize: number;
    status?: number;
    startTime?: string;
    endTime?: string;
    keyword?: string;
  }) {
    const query = this.conversations
      .createQueryBuilder('conversation')
      .leftJoin(User, 'user', 'user.id = conversation.userId');
    if (input.status !== undefined) {
      query.andWhere('conversation.status = :status', {
        status: input.status,
      });
    }
    if (input.startTime) {
      query.andWhere('conversation.createdAt >= :startTime', {
        startTime: input.startTime,
      });
    }
    if (input.endTime) {
      query.andWhere('conversation.createdAt <= :endTime', {
        endTime: input.endTime,
      });
    }
    if (input.keyword) {
      query.andWhere(
        '(conversation.sessionNo LIKE :keyword OR user.nickname LIKE :keyword)',
        { keyword: `%${input.keyword}%` },
      );
    }
    const [list, total] = await query
      .orderBy('conversation.lastMessageAt', 'DESC')
      .addOrderBy('conversation.id', 'DESC')
      .skip((input.page - 1) * input.pageSize)
      .take(input.pageSize)
      .getManyAndCount();

    const conversationIds = list.map((conversation) => conversation.id);
    const userIds = Array.from(
      new Set(list.map((conversation) => conversation.userId)),
    );
    const users = userIds.length
      ? await this.users.find({
          where: { id: In(userIds) },
          select: { id: true, nickname: true, phone: true, avatarUrl: true },
        })
      : [];
    const messageCounts = conversationIds.length
      ? await this.messages
          .createQueryBuilder('message')
          .select('message.conversationId', 'conversationId')
          .addSelect('COUNT(message.id)', 'count')
          .where('message.conversationId IN (:...conversationIds)', {
            conversationIds,
          })
          .groupBy('message.conversationId')
          .getRawMany<{ conversationId: string; count: string }>()
      : [];
    const userById = new Map(users.map((user) => [String(user.id), user]));
    const messageCountById = new Map(
      messageCounts.map((row) => [
        String(row.conversationId),
        Number(row.count),
      ]),
    );

    return {
      list: list.map((conversation) => ({
        ...conversation,
        user: userById.get(String(conversation.userId)) ?? null,
        messageCount: messageCountById.get(String(conversation.id)) ?? 0,
      })),
      total,
      page: input.page,
      pageSize: input.pageSize,
    };
  }

  async adminDetail(id: number) {
    const conversation = await this.conversations.findOneBy({ id });
    if (!conversation) {
      throw new NotFoundException('会话不存在');
    }
    const [user, messages] = await Promise.all([
      this.users.findOne({
        where: { id: conversation.userId },
        select: { id: true, nickname: true, phone: true, avatarUrl: true },
      }),
      this.messages.find({
        where: { conversationId: id },
        order: { id: 'ASC' },
      }),
    ]);
    return { ...conversation, user, timeline: messages };
  }

  async adminMessages(id: number, page: number, pageSize: number) {
    const conversation = await this.conversations.exist({ where: { id } });
    if (!conversation) {
      throw new NotFoundException('会话不存在');
    }
    const [list, total] = await this.messages.findAndCount({
      where: { conversationId: id },
      order: { id: 'ASC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { list, total, page, pageSize };
  }

  async takeOver(id: number, agentId: number) {
    const conversation = await this.conversations.findOneBy({ id });
    if (!conversation) {
      throw new NotFoundException('会话不存在');
    }
    if (conversation.status !== 1) {
      throw new ForbiddenException('只有待转人工的会话可以接管');
    }
    conversation.status = 2;
    conversation.agentId = agentId;
    conversation.transferredBy = 'agent';
    conversation.transferredAt = new Date();
    await this.conversations.save(conversation);
    await this.addMessage(conversation.id, 'system', '客服已接管会话', {
      meta: { action: 'agent_take_over', agentId },
    });
    return { id: conversation.id, status: conversation.status };
  }

  async agentReply(id: number, agentId: number, content: string) {
    const conversation = await this.conversations.findOneBy({ id });
    if (!conversation) {
      throw new NotFoundException('会话不存在');
    }
    if (conversation.status !== 2 || conversation.agentId !== agentId) {
      throw new ForbiddenException('当前管理员未接管此会话');
    }
    const trimmed = content?.trim() ?? '';
    if (!trimmed) {
      throw new BadRequestException('回复内容不能为空');
    }
    const message = await this.addMessage(id, 'agent', trimmed);
    await this.touch(conversation);
    return message;
  }

  async adminClose(id: number) {
    const conversation = await this.conversations.findOneBy({ id });
    if (!conversation) {
      throw new NotFoundException('会话不存在');
    }
    return this.closeConversation(conversation, '客服已结束会话');
  }

  async stats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - 6);
    const [
      todayConversations,
      pendingTransfer,
      takenOver,
      endedTotal,
      aiResolved,
      conversations,
      transfers,
      firstResponseRows,
    ] = await Promise.all([
      this.conversations.count({ where: { createdAt: this.after(today) } }),
      this.conversations.count({ where: { status: 1 } }),
      this.conversations.count({ where: { status: 2 } }),
      this.conversations.count({ where: { status: 3 } }),
      this.conversations.count({
        where: { status: 3, transferredAt: IsNull() },
      }),
      this.conversations
        .createQueryBuilder('c')
        .select("DATE_FORMAT(c.createdAt, '%Y-%m-%d')", 'day')
        .addSelect('COUNT(c.id)', 'count')
        .where('c.createdAt >= :weekStart', { weekStart })
        .groupBy('day')
        .getRawMany<{ day: string; count: string }>(),
      this.conversations
        .createQueryBuilder('c')
        .select("DATE_FORMAT(c.transferredAt, '%Y-%m-%d')", 'day')
        .addSelect('COUNT(c.id)', 'count')
        .where('c.transferredAt >= :weekStart', { weekStart })
        .groupBy('day')
        .getRawMany<{ day: string; count: string }>(),
      this.messages
        .createQueryBuilder('m')
        .select(
          'AVG(TIMESTAMPDIFF(SECOND, c.createdAt, m.createdAt))',
          'seconds',
        )
        .innerJoin(AiConversation, 'c', 'c.id = m.conversationId')
        .where("m.role IN ('assistant', 'agent')")
        .andWhere(
          "m.id = (SELECT MIN(m2.id) FROM ai_messages m2 WHERE m2.conversation_id = c.id AND m2.role IN ('assistant', 'agent'))",
        )
        .getRawOne<{ seconds: string | null }>(),
    ]);

    const dayKey = (date: Date) =>
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const fillTrend = (rows: Array<{ day: string; count: string }>) => {
      const counts = new Map(rows.map((row) => [row.day, Number(row.count)]));
      return Array.from({ length: 7 }, (_, index) => {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + index);
        const key = dayKey(date);
        return { date: key, count: counts.get(key) ?? 0 };
      });
    };

    return {
      todayConversations,
      todayConversationCount: todayConversations,
      pendingTransfer,
      pendingTransferCount: pendingTransfer,
      takenOver,
      takenOverConversations: takenOver,
      takenOverCount: takenOver,
      aiResolutionRate: endedTotal
        ? Number((aiResolved / endedTotal).toFixed(4))
        : 0,
      averageFirstResponseSeconds: Number(firstResponseRows?.seconds ?? 0),
      conversationTrend: fillTrend(conversations),
      transferTrend: fillTrend(transfers),
    };
  }

  private after(date: Date) {
    return MoreThanOrEqual(date);
  }
}
