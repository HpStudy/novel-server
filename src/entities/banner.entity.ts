import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('banners')
export class Banner {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({ type: 'varchar', length: 100, default: '' })
  title: string;

  @Column({ type: 'varchar', length: 255, default: '', name: 'image_url' })
  imageUrl: string;

  @Column({ type: 'tinyint', default: 1, name: 'link_type' })
  linkType: number;

  @Column({ type: 'varchar', length: 255, default: '', name: 'link_target' })
  linkTarget: string;

  @Column({ type: 'int', default: 0 })
  sort: number;

  @Column({ type: 'tinyint', default: 1 })
  status: number;

  @Column({ type: 'datetime', nullable: true, name: 'start_at' })
  startAt?: Date | null;

  @Column({ type: 'datetime', nullable: true, name: 'end_at' })
  endAt?: Date | null;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt: Date;
}
