import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('ai_knowledge_docs')
@Index('idx_ai_knowledge_docs_status', ['status'])
@Index('idx_ai_knowledge_docs_created', ['createdAt'])
export class AiKnowledgeDoc {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'longtext', nullable: true })
  content?: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'file_url' })
  fileUrl?: string;

  @Column({ type: 'tinyint', name: 'source_type' })
  sourceType: number;

  @Column({ type: 'int', default: 0, name: 'chunk_count' })
  chunkCount: number;

  @Column({ type: 'tinyint', default: 0 })
  status: number;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'fail_reason' })
  failReason?: string;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' })
  updatedAt: Date;
}
