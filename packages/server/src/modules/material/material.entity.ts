import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

export enum MaterialType {
  FILTER = 'filter',
  STICKER = 'sticker',
  FONT = 'font',
  TEMPLATE = 'template',
  BACKGROUND = 'background',
}

@Entity('materials')
export class Material {
  @PrimaryGeneratedColumn({ type: 'integer' })
  id: number;

  @Column({ type: 'varchar', length: 32 })
  type: string;

  @Column({ type: 'varchar', length: 128 })
  name: string;

  @Column({ name: 'category_id', type: 'int', default: 0 })
  categoryId: number;

  @Column({ type: 'simple-json', nullable: true })
  tags: string[] | null;

  @Column({ name: 'file_url', type: 'varchar', length: 512, default: '' })
  fileUrl: string;

  @Column({ name: 'thumbnail_url', type: 'varchar', length: 512, default: '' })
  thumbnailUrl: string;

  @Column({ type: 'int', default: 0 })
  width: number;

  @Column({ type: 'int', default: 0 })
  height: number;

  @Column({ type: 'int', default: 0 })
  weight: number;

  @Column({ type: 'integer', default: 1 })
  status: number;

  @Column({ name: 'creator_id', type: 'integer', default: 0 })
  creatorId: number;

  @Column({ name: 'audit_status', type: 'integer', default: 1 })
  auditStatus: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
