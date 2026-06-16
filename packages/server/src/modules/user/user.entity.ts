import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn({ type: 'integer' })
  id: number;

  @Column({ type: 'varchar', length: 64, default: '' })
  nickname: string;

  @Column({ name: 'avatar_url', type: 'varchar', length: 512, default: '' })
  avatarUrl: string;

  @Column({ type: 'varchar', length: 20, default: '', unique: true })
  phone: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 256, default: '' })
  passwordHash: string;

  @Column({ name: 'wechat_unionid', type: 'varchar', length: 64, default: '' })
  wechatUnionid: string;

  @Column({ name: 'vip_level', type: 'integer', default: 0 })
  vipLevel: number;

  @Column({ name: 'vip_expire_time', type: 'datetime', nullable: true })
  vipExpireTime: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
