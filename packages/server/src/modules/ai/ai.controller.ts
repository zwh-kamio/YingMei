import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { AiService } from './ai.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  /** 提交 AI 抠图任务 */
  @Post('cutout')
  async createCutout(
    @CurrentUser('id') userId: number,
    @Body() body: { imageUrl: string },
  ) {
    return this.aiService.createTask(userId, {
      type: 'cutout',
      imageUrl: body.imageUrl,
    });
  }

  /** 提交 AI 消除任务 */
  @Post('remove')
  async createRemove(
    @CurrentUser('id') userId: number,
    @Body() body: { imageUrl: string; maskUrl?: string },
  ) {
    return this.aiService.createTask(userId, {
      type: 'remove',
      imageUrl: body.imageUrl,
      params: { maskUrl: body.maskUrl },
    });
  }

  /** 提交画质增强任务 */
  @Post('enhance')
  async createEnhance(
    @CurrentUser('id') userId: number,
    @Body() body: { imageUrl: string },
  ) {
    return this.aiService.createTask(userId, {
      type: 'enhance',
      imageUrl: body.imageUrl,
    });
  }

  /** 提交人像美颜任务 */
  @Post('beautify')
  async createBeautify(
    @CurrentUser('id') userId: number,
    @Body() body: { imageUrl: string },
  ) {
    return this.aiService.createTask(userId, {
      type: 'beautify',
      imageUrl: body.imageUrl,
    });
  }

  /** 查询任务进度 */
  @Get('task/:taskId')
  async getTask(@Param('taskId') taskId: number) {
    return this.aiService.getTask(taskId);
  }
}
