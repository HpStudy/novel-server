import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('comments')
export class Comment {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint', name: 'user_id' })
  userId: number;

  @Column({ type: 'bigint', name: 'book_id' })
  bookId: number;

  @Column({ type: 'bigint', name: 'chapter_id', nullable: true })
  chapterId?: number;

  @Column({ type: 'varchar', length: 500 })
  content: string;

  @Column({ type: 'int', default: 0, name: 'like_count' })
  likeCount: number;

  @Column({ type: 'tinyint', default: 1 })
  status: number;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt: Date;
}
