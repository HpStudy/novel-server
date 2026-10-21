import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'varchar', length: 32, unique: true, name: 'order_no' })
  orderNo: string;

  @Column({ type: 'bigint', name: 'user_id' })
  userId: number;

  @Column({ type: 'tinyint' })
  type: number;

  @Column({ type: 'bigint', name: 'target_id', nullable: true })
  targetId?: number;

  @Column({ type: 'bigint', name: 'book_id', nullable: true })
  bookId?: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  amount: number;

  @Column({ type: 'int', default: 0 })
  coins: number;

  @Column({ type: 'tinyint', default: 0 })
  status: number;

  @Column({ type: 'datetime', nullable: true, name: 'paid_at' })
  paidAt?: Date;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt: Date;
}
