import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('ai_settings')
export class AiSetting {
  @PrimaryColumn({ type: 'varchar', length: 50, name: 'setting_key' })
  settingKey: string;

  @Column({ type: 'text', name: 'setting_value' })
  settingValue: string;

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' })
  updatedAt: Date;
}
