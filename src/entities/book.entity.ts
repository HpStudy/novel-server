import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('books')
export class Book {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'int', name: 'category_id' })
  categoryId: number;

  @Column({ type: 'varchar', length: 100 })
  title: string;

  @Column({ type: 'varchar', length: 50, default: '' })
  author: string;

  @Column({ type: 'varchar', length: 255, default: '', name: 'cover_url' })
  coverUrl: string;

  @Column({ type: 'text', default: '' })
  description: string;

  @Column({ type: 'varchar', length: 255, default: '' })
  tags: string;

  @Column({ type: 'int', default: 0, name: 'word_count' })
  wordCount: number;

  @Column({ type: 'int', default: 0, name: 'chapter_count' })
  chapterCount: number;

  @Column({ type: 'tinyint', default: 1 })
  status: number;

  @Column({ type: 'tinyint', default: 0, name: 'is_vip' })
  isVip: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0.1, name: 'price_per_chapter' })
  pricePerChapter: number;

  @Column({ type: 'int', default: 10, name: 'free_chapters' })
  freeChapters: number;

  @Column({ type: 'bigint', default: 0, name: 'read_count' })
  readCount: number;

  @Column({ type: 'decimal', precision: 2, scale: 1, default: 0 })
  score: number;

  @Column({ type: 'datetime', nullable: true, name: 'published_at' })
  publishedAt?: Date | null;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' })
  updatedAt: Date;
}
