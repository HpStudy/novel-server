import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('chapters')
@Index('uq_chapters_book_num', ['bookId', 'chapterNum'], { unique: true })
export class Chapter {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint', name: 'book_id' })
  bookId: number;

  @Column({ type: 'int', name: 'chapter_num' })
  chapterNum: number;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'mediumtext' })
  content: string;

  @Column({ type: 'int', default: 0, name: 'word_count' })
  wordCount: number;

  @Column({ type: 'tinyint', default: 0, name: 'is_free' })
  isFree: number;

  @Column({ type: 'tinyint', default: 1 })
  status: number;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt: Date;

  @Column({ type: 'datetime', nullable: true, name: 'published_at' })
  publishedAt?: Date | null;

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' })
  updatedAt: Date;
}
