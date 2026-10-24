import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { VectorDataSource } from '../../datasources/vector.datasource';
import { AiSettingsService } from './ai-settings.service';

export interface VectorMatch {
  id: string;
  docId: number;
  chunkIndex: number;
  content: string;
  similarity: number;
}

@Injectable()
export class VectorService implements OnModuleInit {
  constructor(
    private readonly dataSource: VectorDataSource,
    private readonly config: ConfigService,
    private readonly settings: AiSettingsService,
  ) {}

  async onModuleInit() {
    if (this.config.get<string>('VECTOR_DB_AUTO_MIGRATE') === 'true') {
      const configuredDimension = Number(
        await this.settings.get('embeddingDimensions'),
      );
      const dimensions =
        Number.isInteger(configuredDimension) && configuredDimension > 0
          ? configuredDimension
          : 1536;
      await this.dataSource.query('CREATE EXTENSION IF NOT EXISTS vector');
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS ai_vectors (
          id VARCHAR(64) PRIMARY KEY,
          doc_id BIGINT NOT NULL,
          chunk_index INT NOT NULL,
          content TEXT NOT NULL,
          embedding vector(${dimensions}) NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
          UNIQUE (doc_id, chunk_index)
        )
      `);
      await this.dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_ai_vectors_embedding
        ON ai_vectors USING hnsw (embedding vector_cosine_ops)
      `);
      await this.dataSource.query(
        'CREATE INDEX IF NOT EXISTS idx_ai_vectors_doc_id ON ai_vectors (doc_id)',
      );
    }
  }

  async upsert(
    docId: number,
    chunkIndex: number,
    content: string,
    embedding: number[],
  ): Promise<string> {
    await this.assertDimension(embedding);
    const id = randomUUID();
    await this.dataSource.query(
      `INSERT INTO ai_vectors (id, doc_id, chunk_index, content, embedding)
       VALUES ($1, $2, $3, $4, $5::vector)
       ON CONFLICT (doc_id, chunk_index) DO UPDATE
       SET id = EXCLUDED.id, content = EXCLUDED.content, embedding = EXCLUDED.embedding
       RETURNING id`,
      [id, docId, chunkIndex, content, this.serialize(embedding)],
    );
    const result = await this.dataSource.query<{ id: string }>(
      'SELECT id FROM ai_vectors WHERE doc_id = $1 AND chunk_index = $2',
      [docId, chunkIndex],
    );
    return result.rows[0].id;
  }

  async search(embedding: number[], topK: number): Promise<VectorMatch[]> {
    await this.assertDimension(embedding);
    const result = await this.dataSource.query<{
      id: string;
      doc_id: string;
      chunk_index: number;
      content: string;
      similarity: number;
    }>(
      `SELECT id, doc_id, chunk_index, content,
              1 - (embedding <=> $1::vector) AS similarity
       FROM ai_vectors
       ORDER BY embedding <=> $1::vector
       LIMIT $2`,
      [this.serialize(embedding), topK],
    );
    return result.rows.map((row) => ({
      id: row.id,
      docId: Number(row.doc_id),
      chunkIndex: row.chunk_index,
      content: row.content,
      similarity: Number(row.similarity),
    }));
  }

  async deleteDocument(docId: number): Promise<void> {
    await this.dataSource.query('DELETE FROM ai_vectors WHERE doc_id = $1', [
      docId,
    ]);
  }

  private serialize(embedding: number[]) {
    return `[${embedding.join(',')}]`;
  }

  private async assertDimension(embedding: number[]) {
    const configuredDimension = Number(
      await this.settings.get('embeddingDimensions'),
    );
    if (embedding.length !== configuredDimension) {
      throw new Error(
        `Embedding dimension ${embedding.length} does not match configured dimension ${configuredDimension}`,
      );
    }
  }
}
