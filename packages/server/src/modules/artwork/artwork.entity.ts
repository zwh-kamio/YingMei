import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('artworks')
export class Artwork {
  @PrimaryGeneratedColumn({ type: 'integer' })
  id: number;

  @Column({ name: 'user_id', type: 'integer' })
  userId: number;

  @Column({ type: 'varchar', length: 256, default: '' })
  title: string;

  @Column({ name: 'original_image_url', type: 'varchar', length: 512, default: '' })
  originalImageUrl: string;

  @Column({ name: 'edit_config', type: 'simple-json', nullable: true })
  editConfig: Record<string, unknown> | null;

  @Column({ name: 'thumbnail_url', type: 'varchar', length: 512, default: '' })
  thumbnailUrl: string;

  @Column({ name: 'exported_image_url', type: 'varchar', length: 512, default: '' })
  exportedImageUrl: string;

  @Column({ name: 'is_public', type: 'integer', default: 0 })
  isPublic: number;

  @Column({ type: 'int', default: 0 })
  likes: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
