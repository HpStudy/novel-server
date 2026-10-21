import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('favorites')
@Index('uq_user_book_favorite', ['userId', 'bookId'], { unique: true })
export class Favorite {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint', name: 'user_id' })
  userId: number;

  @Column({ type: 'bigint', name: 'book_id' })
  bookId: number;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt: Date;
}
