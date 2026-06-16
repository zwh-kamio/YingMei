import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { AiTask } from '../ai-task/ai-task.entity';

export interface CreateTaskDto {
  type: string;
  imageUrl: string;
  params?: Record<string, unknown>;
}

/** Qwen-Image-Edit 任务指令映射 */
const TASK_INSTRUCTIONS: Record<string, string> = {
  cutout:
    'Remove the background of this image completely. Make the background transparent and keep only the main subject person in the foreground.',
  enhance:
    'Enhance this image quality by 2x super resolution. Sharpen details, reduce noise, improve clarity, and make colors more vibrant. Output a higher quality version.',
  remove:
    'Remove the unwanted object or watermark from this image. Naturally fill the inpainted area to blend seamlessly with the surrounding background.',
  beautify:
    'Apply professional portrait retouching to this image: (1) Smooth skin naturally while preserving pores, micro-detail, and tonal variation — avoid plastic/airbrushed look; (2) Brighten and even out skin tone slightly for a healthy warm glow; (3) Enhance facial features subtly — sharpen eyes, define brows, add natural lip color; (4) Reduce fine lines and minor blemishes gently. Keep the person\'s facial identity, hairstyle, clothing, background, and overall composition completely unchanged. Output a natural-looking professional portrait.',
};

@Injectable()
export class AiService {
  private readonly dashscopeApiKey: string;
  private readonly dashscopeBaseUrl: string;
  private readonly iopaintUrl: string;

  constructor(
    @InjectRepository(AiTask)
    private aiTaskRepo: Repository<AiTask>,
    private config: ConfigService,
  ) {
    this.dashscopeApiKey = config.get('DASHSCOPE_API_KEY', '');
    this.dashscopeBaseUrl =
      config.get('DASHSCOPE_BASE_URL', 'https://dashscope.aliyuncs.com/api/v1');
    this.iopaintUrl = config.get('IOPAINT_URL', 'http://localhost:8080');
  }

  /** 创建 AI 任务 */
  async createTask(userId: number, dto: CreateTaskDto) {
    const task = this.aiTaskRepo.create({
      userId,
      type: dto.type,
      inputImageUrl: dto.imageUrl,
      params: dto.params || {},
      status: 'pending',
      progress: 0,
    });
    await this.aiTaskRepo.save(task);

    // 异步处理任务（不阻塞返回）
    this.processTask(task.id).catch((err) =>
      console.error(`AI task ${task.id} failed:`, err.message),
    );

    return { taskId: task.id, status: task.status };
  }

  /** 查询任务状态 */
  async getTask(taskId: number) {
    const task = await this.aiTaskRepo.findOne({ where: { id: taskId } });
    if (!task) throw new BadRequestException('任务不存在');
    return {
      taskId: task.id,
      type: task.type,
      status: task.status,
      progress: task.progress,
      resultImageUrl: task.outputImageUrl,
      errorMsg: task.errorMsg,
    };
  }

  /** 处理 AI 任务（调用 DashScope Qwen-Image-Edit 模型） */
  private async processTask(taskId: number) {
    const task = await this.aiTaskRepo.findOne({ where: { id: taskId } });
    if (!task) return;

    task.status = 'processing';
    task.progress = 10;
    await this.aiTaskRepo.save(task);

    try {
      // remove 类型使用 IOPaint；其他类型使用 DashScope
      const resultUrl =
        task.type === 'remove'
          ? await this.callIopaint(task)
          : await this.callImageEdit(task);
      task.status = 'completed';
      task.progress = 100;
      task.outputImageUrl = resultUrl;
      task.completedAt = new Date();
    } catch (err: any) {
      task.status = 'failed';
      task.errorMsg = err.message || 'AI 处理失败';
    }

    await this.aiTaskRepo.save(task);
  }

  /**
   * 调用 DashScope Qwen-Image-Edit 模型进行图像编辑
   * 统一使用 /services/aigc/multimodal-generation/generation 端点
   */
  private async callImageEdit(task: AiTask): Promise<string> {
    const instruction = TASK_INSTRUCTIONS[task.type] || TASK_INSTRUCTIONS.enhance;

    // 构建 messages content 数组
    const content: any[] = [{ image: task.inputImageUrl }];

    // 消除模式：如果有 maskUrl，作为第二张参考图传入
    if (task.type === 'remove' && task.params?.['maskUrl']) {
      content.push({ image: task.params['maskUrl'] as string });
    }

    content.push({ text: instruction });

    const requestBody: any = {
      model: 'qwen-image-edit-plus',
      input: {
        messages: [
          {
            role: 'user',
            content,
          },
        ],
      },
      parameters: {
        n: 1,
        watermark: false,
        prompt_extend: false,
      },
    };

    // 增强模式不强制指定输出尺寸，由 AI 模型保持原始图片宽高比

    console.log(
      `[DashScope] Calling image edit, task=${task.id}, type=${task.type}`,
    );

    const response = await fetch(
      `${this.dashscopeBaseUrl}/services/aigc/multimodal-generation/generation`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.dashscopeApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      },
    );

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(
        `DashScope API error: ${response.status}${errText ? ' - ' + errText : ''}`,
      );
    }

    const data: any = await response.json();

    // 检查业务错误码
    if (data.code && data.code !== 200) {
      throw new Error(data.message || `DashScope error code: ${data.code}`);
    }

    // 解析输出图片 URL
    const choices = data.output?.choices;
    if (!choices || choices.length === 0) {
      throw new Error('DashScope 返回结果为空');
    }

    const imageContent = choices[0]?.message?.content?.find(
      (c: any) => c.image,
    );
    if (!imageContent?.image) {
      throw new Error('DashScope 未返回图片');
    }

    console.log(`[DashScope] Task ${task.id} completed`);
    return imageContent.image;
  }

  /**
   * 调用 IOPaint（LaMa 模型）进行图像消除
   * API: POST /api/v1/inpaint  — image + mask（均为 base64）
   */
  private async callIopaint(task: AiTask): Promise<string> {
    const maskUrl = task.params?.['maskUrl'] as string | undefined;
    if (!maskUrl) {
      throw new Error('消除功能需要提供遮罩图');
    }

    // 将图片 URL/dataURL 转为 base64
    const [imageB64, maskB64] = await Promise.all([
      this.toBase64(task.inputImageUrl),
      this.toBase64(maskUrl),
    ]);

    console.log(`[IOPaint] Calling inpaint, task=${task.id}`);

    const response = await fetch(`${this.iopaintUrl}/api/v1/inpaint`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: imageB64, mask: maskB64 }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(
        `IOPaint error: ${response.status}${errText ? ' - ' + errText : ''}`,
      );
    }

    // IOPaint 直接返回二进制图片数据
    const buffer = Buffer.from(await response.arrayBuffer());
    const resultB64 = buffer.toString('base64');
    console.log(`[IOPaint] Task ${task.id} completed`);
    return `data:image/png;base64,${resultB64}`;
  }

  /** 将 URL 或 data URL 转为纯 base64 字符串 */
  private async toBase64(url: string): Promise<string> {
    // 已经是 data URL → 提取 base64 部分
    if (url.startsWith('data:')) {
      const commaIdx = url.indexOf(',');
      return commaIdx >= 0 ? url.slice(commaIdx + 1) : url;
    }

    // 普通 URL → 下载后转 base64
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    return buffer.toString('base64');
  }
}
