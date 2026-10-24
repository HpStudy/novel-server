import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('ai_conversations')
@Index('idx_ai_conversations_user', ['userId'])
@Index('idx_ai_conversations_status', ['status'])
@Index('idx_ai_conversations_last_message', ['lastMessageAt'])
export class AiConversation {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'varchar', length: 32, unique: true, name: 'session_no' })
  sessionNo: string;

  @Column({ type: 'bigint', name: 'user_id' })
  userId: number;

  @Column({ type: 'varchar', length: 30, default: 'home' })
  source: string;

  @Column({ type: 'tinyint', default: 0 })
  status: number;

  @Column({ type: 'datetime', nullable: true, name: 'last_message_at' })
  lastMessageAt?: Date;

  @Column({
    type: 'varchar',
    length: 10,
    nullable: true,
    name: 'transferred_by',
  })
  transferredBy?: string;

  @Column({ type: 'bigint', nullable: true, name: 'agent_id' })
  agentId?: number;

  @Column({ type: 'datetime', nullable: true, name: 'transferred_at' })
  transferredAt?: Date;

  @Column({ type: 'datetime', nullable: true, name: 'ended_at' })
  endedAt?: Date;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' })
  updatedAt: Date;
}
