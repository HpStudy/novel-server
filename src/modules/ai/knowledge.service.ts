import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  PayloadTooLargeException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bull';
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import { lookup } from 'dns/promises';
import { isIP } from 'net';
import { dirname, join, resolve } from 'path';
import { In, Repository } from 'typeorm';
import { AiKnowledgeChunk } from '../../entities/ai/ai-knowledge-chunk.entity';
import { AiKnowledgeDoc } from '../../entities/ai/ai-knowledge-doc.entity';
import { AiSettingsService } from './ai-settings.service';
import { EmbeddingService } from './embedding.service';
import { VectorService } from './vector.service';

const maxDocumentBytes = 10 * 1024 * 1024;
const allowedExtensions = new Set(['.txt', '.md', '.pdf', '.docx']);

@Injectable()
export class KnowledgeService {
  private readonly logger = new Logger(KnowledgeService.name);

  constructor(
    @InjectRepository(AiKnowledgeDoc)
    private readonly docRepository: Repository<AiKnowledgeDoc>,
    @InjectRepository(AiKnowledgeChunk)
    private readonly chunkRepository: Repository<AiKnowledgeChunk>,
    @InjectQueue('ai-knowledge')
    private readonly parseQueue: Queue,
    private readonly embeddingService: EmbeddingService,
    private readonly vectorService: VectorService,
    private readonly settings: AiSettingsService,
  ) {}

  async list(page: number, pageSize: number, keyword?: string) {
    const query = this.docRepository.createQueryBuilder('doc');
    if (keyword) {
      query.where('doc.title LIKE :keyword', { keyword: `%${keyword}%` });
    }
    const [list, total] = await query
      .orderBy('doc.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();
    return { list, total, page, pageSize };
  }

  async create(input: {
    title: string;
    content?: string;
    fileUrl?: string;
    url?: string;
    sourceType: number;
  }) {
    const fileUrl = input.fileUrl ?? input.url;
    const content = input.content?.trim();
    if (!content && !fileUrl) {
      throw new BadRequestException('正文或文件地址必须提供一个');
    }
    if (content && fileUrl) {
      throw new BadRequestException('正文与文件地址不能同时提供');
    }
    if (![1, 2, 3].includes(input.sourceType)) {
      throw new BadRequestException('sourceType 必须为 1、2 或 3');
    }
    if (input.sourceType === 1 && !content) {
      throw new BadRequestException('手工录入文档必须提供正文');
    }
    if (input.sourceType === 2 && !fileUrl) {
      throw new BadRequestException('文件文档必须提供 fileUrl');
    }
    if (input.sourceType === 3 && !fileUrl) {
      throw new BadRequestException('网页抓取文档必须提供 url');
    }

    const doc = this.docRepository.create({
      title: input.title.trim(),
      content: content || undefined,
      fileUrl,
      sourceType: input.sourceType,
      status: 0,
    });
    return this.docRepository.save(doc);
  }

  async update(
    id: number,
    input: { title?: string; content?: string; fileUrl?: string; url?: string },
  ) {
    const doc = await this.getDoc(id);
    const fileUrl = input.fileUrl ?? input.url;
    if (input.content !== undefined && fileUrl !== undefined) {
      throw new BadRequestException('正文与文件地址不能同时提供');
    }
    if (input.content !== undefined && !input.content.trim()) {
      throw new BadRequestException('正文不能为空');
    }
    doc.status = 0;
    doc.failReason = undefined;
    await this.docRepository.save(doc);
    try {
      await this.vectorService.deleteDocument(id);
    } catch {
      doc.status = 3;
      doc.failReason = '旧向量清理失败，请检查向量数据库后重试';
      await this.docRepository.save(doc);
      this.logger.error(`Unable to delete old vectors for document ${id}`);
      throw new ServiceUnavailableException('旧知识向量清理失败');
    }
    await this.chunkRepository.delete({ docId: id });
    if (input.title !== undefined) {
      doc.title = input.title.trim();
    }
    if (input.content !== undefined) {
      doc.content = input.content.trim();
      doc.fileUrl = undefined;
      doc.sourceType = 1;
    } else if (fileUrl !== undefined) {
      doc.fileUrl = fileUrl;
      doc.content = undefined;
      doc.sourceType = input.url !== undefined ? 3 : 2;
    }
    doc.chunkCount = 0;
    return this.docRepository.save(doc);
  }

  async enqueueParse(id: number) {
    const doc = await this.getDoc(id);
    const jobId = `knowledge-parse-${id}`;
    try {
      const existing = await this.parseQueue.getJob(jobId);
      if (existing) {
        const state = await existing.getState();
        if (state !== 'active') {
          await existing.remove();
        }
      }
    } catch (error) {
      this.logger.warn(`Unable to reset parse job ${jobId}: ${String(error)}`);
    }
    await this.docRepository.update(id, {
      status: 1,
      failReason: undefined,
    });
    try {
      await this.parseQueue.add(
        'parse',
        { docId: id },
        {
          jobId,
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
          removeOnComplete: true,
          removeOnFail: 100,
        },
      );
    } catch {
      this.logger.error(`Unable to enqueue parse job for document ${id}`);
      await this.docRepository.update(id, {
        status: 3,
        failReason: '解析任务入队失败，请检查队列服务后重试',
      });
      throw new ServiceUnavailableException('知识库解析任务入队失败');
    }
    return { id: doc.id, status: 1, queued: true };
  }

  async delete(id: number) {
    const doc = await this.getDoc(id);
    await this.docRepository.update(id, { status: 0 });
    try {
      await this.vectorService.deleteDocument(id);
    } catch {
      await this.docRepository.update(id, {
        status: 3,
        failReason: '向量清理失败，文档已停用，请检查后重试删除',
      });
      this.logger.error(`Unable to remove vectors for document ${id}`);
      throw new ServiceUnavailableException('知识向量清理失败，文档已停用');
    }

    await this.docRepository.delete(id);
    await this.chunkRepository.delete({ docId: id });
    return { deleted: true, title: doc.title };
  }

  async chunks(id: number) {
    await this.getDoc(id);
    const list = await this.chunkRepository.find({
      where: { docId: id },
      order: { chunkIndex: 'ASC' },
    });
    return list.map((chunk) => ({
      ...chunk,
      embedded: Boolean(chunk.vectorId),
    }));
  }

  async lookupChunks(vectorIds: string[]) {
    if (!vectorIds.length) {
      return [];
    }
    const chunks = await this.chunkRepository.find({
      where: { vectorId: In(vectorIds) },
    });
    const docs = await this.docRepository.find({
      where: { id: In(chunks.map((chunk) => chunk.docId)), status: 2 },
      select: { id: true, title: true },
    });
    const titleByDocId = new Map(docs.map((doc) => [doc.id, doc.title]));
    return chunks
      .filter((chunk) => titleByDocId.has(chunk.docId))
      .map((chunk) => ({
        vectorId: chunk.vectorId,
        docId: chunk.docId,
        chunkIndex: chunk.chunkIndex,
        title: titleByDocId.get(chunk.docId) ?? '',
      }));
  }

  async parseDocument(id: number) {
    const doc = await this.getDoc(id);
    await this.docRepository.update(id, { status: 1, failReason: undefined });
    try {
      const text = await this.loadContent(doc);
      const pieces = this.splitText(text);
      if (!pieces.length) {
        throw new BadRequestException('文档内容为空，无法切片');
      }

      await this.vectorService.deleteDocument(id);
      await this.chunkRepository.delete({ docId: id });
      const savedChunks: AiKnowledgeChunk[] = [];
      for (const [chunkIndex, content] of pieces.entries()) {
        const embedding = await this.embeddingService.embed(content);
        const vectorId = await this.vectorService.upsert(
          id,
          chunkIndex,
          content,
          embedding,
        );
        savedChunks.push(
          this.chunkRepository.create({
            docId: id,
            chunkIndex,
            content,
            tokenCount: Math.ceil(content.length / 4),
            vectorId,
          }),
        );
      }
      await this.chunkRepository.save(savedChunks);
      await this.docRepository.update(id, {
        chunkCount: savedChunks.length,
        status: 2,
        failReason: undefined,
      });
    } catch (error) {
      try {
        await this.vectorService.deleteDocument(id);
        await this.chunkRepository.delete({ docId: id });
      } catch {
        this.logger.error(`Failed to clean partial vectors for document ${id}`);
      }
      const reason =
        error instanceof Error ? error.message.slice(0, 500) : '文档解析失败';
      await this.docRepository.update(id, {
        status: 3,
        failReason: reason,
        chunkCount: 0,
      });
      this.logger.error(`Knowledge document ${id} parsing failed: ${reason}`);
      throw error;
    }
  }

  async loadContent(doc: AiKnowledgeDoc): Promise<string> {
    if (doc.content) {
      return doc.content;
    }
    if (doc.sourceType === 3) {
      return this.fetchWebPage(doc.fileUrl ?? '');
    }
    const filePath = this.resolveUploadedFile(doc.fileUrl ?? '');
    const stat = await readFile(filePath);
    if (stat.byteLength > maxDocumentBytes) {
      throw new PayloadTooLargeException('知识库文件不能超过 10MB');
    }
    const extension = filePath.slice(filePath.lastIndexOf('.')).toLowerCase();
    if (!allowedExtensions.has(extension)) {
      throw new BadRequestException('仅支持 TXT、MD、PDF 或 Word 文档');
    }
    if (extension === '.txt' || extension === '.md') {
      return stat.toString('utf8');
    }
    if (extension === '.pdf') {
      const pdf = (await import('pdf-parse')).default;
      const parsed = await pdf(stat);
      return parsed.text;
    }
    const mammoth = await import('mammoth');
    const parsed = await mammoth.extractRawText({ buffer: stat });
    return parsed.value;
  }

  private async fetchWebPage(urlValue: string): Promise<string> {
    let url: URL;
    try {
      url = new URL(urlValue);
    } catch {
      throw new BadRequestException('网页 URL 无效');
    }
    if (url.protocol !== 'https:') {
      throw new BadRequestException('网页抓取仅允许 HTTPS');
    }
    const addresses = isIP(url.hostname)
      ? [{ address: url.hostname }]
      : await lookup(url.hostname, { all: true });
    if (
      addresses.some(({ address }) =>
        /^(127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|::1$|fc|fd|fe80)/i.test(
          address,
        ),
      )
    ) {
      throw new BadRequestException('不允许抓取内网地址');
    }
    const response = await fetch(url, {
      redirect: 'error',
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      throw new BadRequestException(`网页抓取失败：HTTP ${response.status}`);
    }
    const length = Number(response.headers.get('content-length') ?? 0);
    if (length > maxDocumentBytes) {
      throw new PayloadTooLargeException('网页内容不能超过 10MB');
    }
    const html = await response.text();
    if (Buffer.byteLength(html, 'utf8') > maxDocumentBytes) {
      throw new PayloadTooLargeException('网页内容不能超过 10MB');
    }
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&#39;|&apos;/gi, "'")
      .replace(/&quot;/gi, '"')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private resolveUploadedFile(fileUrl: string): string {
    const filename = fileUrl.split('/').pop() ?? '';
    if (!/^[0-9a-f-]{36}\.(txt|md|pdf|docx)$/i.test(filename)) {
      throw new BadRequestException('知识库文件地址无效');
    }
    const knowledgeDirectory = resolve(process.cwd(), 'uploads', 'knowledge');
    const path = resolve(join(knowledgeDirectory, filename));
    if (dirname(path) !== knowledgeDirectory || !existsSync(path)) {
      throw new NotFoundException('知识库文件不存在');
    }
    return path;
  }

  private splitText(text: string): string[] {
    const normalized = text.replace(/\r\n/g, '\n').trim();
    const chunks: string[] = [];
    const maxLength = 1200;
    const overlap = 120;
    for (let start = 0; start < normalized.length;) {
      let end = Math.min(start + maxLength, normalized.length);
      if (end < normalized.length) {
        const boundary = normalized.lastIndexOf('\n', end);
        if (boundary > start + maxLength / 2) {
          end = boundary;
        }
      }
      const chunk = normalized.slice(start, end).trim();
      if (chunk) {
        chunks.push(chunk);
      }
      if (end >= normalized.length) {
        break;
      }
      start = Math.max(end - overlap, start + 1);
    }
    return chunks;
  }

  private async getDoc(id: number) {
    const doc = await this.docRepository.findOneBy({ id });
    if (!doc) {
      throw new NotFoundException('知识库文档不存在');
    }
    return doc;
  }
}
