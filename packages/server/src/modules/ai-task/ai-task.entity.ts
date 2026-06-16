import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('ai_tasks')
export class AiTask {
  @PrimaryGeneratedColumn({ type: 'integer' })
  id: number;

  @Column({ name: 'user_id', type: 'integer', default: 0 })
  userId: number;

  @Column({ type: 'varchar', length: 32 })
  type: string;

  @Column({ name: 'input_image_url', type: 'longtext' })
  inputImageUrl: string;

  @Column({ type: 'simple-json', nullable: true })
  params: Record<string, unknown> | null;

  @Column({ name: 'output_image_url', type: 'longtext', nullable: true })
  outputImageUrl: string;

  @Column({ type: 'varchar', length: 32, default: 'pending' })
  status: string;

  @Column({ type: 'int', default: 0 })
  progress: number;

  @Column({ name: 'error_msg', type: 'varchar', length: 4096, default: '' })
  errorMsg: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'completed_at', type: 'datetime', nullable: true })
  completedAt: Date | null;
}
