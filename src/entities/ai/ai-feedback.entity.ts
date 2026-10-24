import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('ai_feedbacks')
@Index('uq_ai_feedback_message_user', ['messageId', 'userId'], { unique: true })
export class AiFeedback {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint', name: 'message_id' })
  messageId: number;

  @Column({ type: 'bigint', name: 'user_id' })
  userId: number;

  @Column({ type: 'tinyint' })
  rating: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  comment?: string;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt: Date;
}
