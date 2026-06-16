import { Controller, Get, Query } from '@nestjs/common';
import { MaterialService } from './material.service';

@Controller('materials')
export class MaterialController {
  constructor(private readonly materialService: MaterialService) {}

  @Get('filters')
  getFilters(
    @Query('category') category?: string,
    @Query('page') page?: number,
    @Query('size') size?: number,
  ) {
    return this.materialService.getFilters(category, page || 1, size || 30);
  }

  @Get('stickers')
  getStickers(
    @Query('keyword') keyword?: string,
    @Query('category') category?: string,
    @Query('page') page?: number,
    @Query('size') size?: number,
  ) {
    return this.materialService.getStickers(keyword, category, page || 1, size || 50);
  }

  @Get('fonts')
  getFonts(@Query('page') page?: number, @Query('size') size?: number) {
    return this.materialService.getFonts(page || 1, size || 50);
  }

  @Get('templates')
  getTemplates(@Query('page') page?: number, @Query('size') size?: number) {
    return this.materialService.getTemplates(page || 1, size || 30);
  }
}
