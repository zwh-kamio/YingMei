import { Controller, Post, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { UploadService } from './upload.service';

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('temp')
  async getTempUploadToken(@Query('type') type?: string) {
    return this.uploadService.getUploadToken(type || 'image');
  }

  /** 图片代理：解决 AI 结果远程 URL 无 CORS 头导致 canvas 污染的问题 */
  @Get('proxy-image')
  async proxyImage(@Query('url') url: string, @Res() res: Response) {
    if (!url) {
      return res.status(400).json({ code: 400, message: 'url required' });
    }

    try {
      const resp = await fetch(url);
      if (!resp.ok) {
        return res.status(resp.status).json({ code: resp.status, message: 'fetch failed' });
      }

      const buffer = Buffer.from(await resp.arrayBuffer());
      const contentType = resp.headers.get('content-type') || 'image/png';
      res.set({
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*',
      });
      res.send(buffer);
    } catch {
      res.status(502).json({ code: 502, message: 'proxy error' });
    }
  }
}
