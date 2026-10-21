import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'varchar', length: 64, unique: true, nullable: true })
  openid?: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  unionid?: string;

  @Column({ type: 'varchar', length: 50, default: '' })
  nickname: string;

  @Column({ type: 'varchar', length: 255, default: '', name: 'avatar_url' })
  avatarUrl: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone?: string;

  @Column({ type: 'tinyint', default: 0 })
  gender: number;

  @Column({ type: 'tinyint', default: 0, name: 'vip_level' })
  vipLevel: number;

  @Column({ type: 'datetime', nullable: true, name: 'vip_expire_at' })
  vipExpireAt?: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  balance: number;

  @Column({ type: 'tinyint', default: 1 })
  status: number;

  @Column({ type: 'tinyint', default: 0 })
  role: number;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' })
  updatedAt: Date;
}
