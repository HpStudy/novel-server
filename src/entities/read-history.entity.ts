import {
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('read_history')
@Index('uq_read_history_user_book', ['userId', 'bookId'], { unique: true })
export class ReadHistory {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint', name: 'user_id' })
  userId: number;

  @Column({ type: 'bigint', name: 'book_id' })
  bookId: number;

  @Column({ type: 'bigint', name: 'chapter_id', default: 0 })
  chapterId: number;

  @Column({ type: 'int', default: 0 })
  progress: number;

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' })
  updatedAt: Date;
}
