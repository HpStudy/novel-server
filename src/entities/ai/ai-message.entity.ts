import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('ai_messages')
@Index('idx_ai_messages_conversation_id', ['conversationId', 'id'])
@Index('uq_ai_messages_client_msg_id', ['clientMsgId'], { unique: true })
export class AiMessage {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint', name: 'conversation_id' })
  conversationId: number;

  @Column({ type: 'varchar', length: 10 })
  role: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'tinyint', default: 0, name: 'msg_type' })
  msgType: number;

  @Column({ type: 'tinyint', default: 0 })
  status: number;

  @Column({ type: 'json', nullable: true })
  meta?: Record<string, unknown>;

  @Column({
    type: 'varchar',
    length: 64,
    nullable: true,
    name: 'client_msg_id',
  })
  clientMsgId?: string;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt: Date;
}
