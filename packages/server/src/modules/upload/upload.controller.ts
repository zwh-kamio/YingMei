import { Controller, Post, Query } from '@nestjs/common';
import { UploadService } from './upload.service';

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('temp')
  async getTempUploadToken(@Query('type') type?: string) {
    return this.uploadService.getUploadToken(type || 'image');
  }
}
