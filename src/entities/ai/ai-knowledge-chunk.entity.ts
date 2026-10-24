import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('ai_knowledge_chunks')
@Index('uq_ai_knowledge_doc_chunk', ['docId', 'chunkIndex'], { unique: true })
export class AiKnowledgeChunk {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint', name: 'doc_id' })
  docId: number;

  @Column({ type: 'int', name: 'chunk_index' })
  chunkIndex: number;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'int', default: 0, name: 'token_count' })
  tokenCount: number;

  @Column({ type: 'varchar', length: 64, nullable: true, name: 'vector_id' })
  vectorId?: string;
}
