import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Material } from './material.entity';

@Injectable()
export class MaterialService {
  constructor(
    @InjectRepository(Material)
    private materialRepo: Repository<Material>,
  ) {}

  async getFilters(category?: string, page: number = 1, size: number = 30) {
    const where: Record<string, unknown> = { type: 'filter', status: 1 };
    if (category) {
      where.categoryId = category;
    }

    const [list, total] = await this.materialRepo.findAndCount({
      where,
      order: { weight: 'DESC', createdAt: 'DESC' },
      skip: (page - 1) * size,
      take: size,
    });

    return {
      list,
      total,
      page,
      size,
      totalPages: Math.ceil(total / size),
    };
  }

  async getStickers(keyword?: string, category?: string, page: number = 1, size: number = 50) {
    const queryBuilder = this.materialRepo
      .createQueryBuilder('m')
      .where('m.type = :type', { type: 'sticker' })
      .andWhere('m.status = :status', { status: 1 });

    if (keyword) {
      queryBuilder.andWhere('m.name LIKE :keyword', { keyword: `%${keyword}%` });
    }
    if (category) {
      queryBuilder.andWhere('m.categoryId = :category', { category });
    }

    queryBuilder
      .orderBy('m.weight', 'DESC')
      .addOrderBy('m.createdAt', 'DESC')
      .skip((page - 1) * size)
      .take(size);

    const [list, total] = await queryBuilder.getManyAndCount();

    return {
      list,
      total,
      page,
      size,
      totalPages: Math.ceil(total / size),
    };
  }

  async getFonts(page: number = 1, size: number = 50) {
    return this.getByType('font', page, size);
  }

  async getTemplates(page: number = 1, size: number = 30) {
    return this.getByType('template', page, size);
  }

  private async getByType(type: string, page: number, size: number) {
    const [list, total] = await this.materialRepo.findAndCount({
      where: { type, status: 1 },
      order: { weight: 'DESC', createdAt: 'DESC' },
      skip: (page - 1) * size,
      take: size,
    });

    return {
      list,
      total,
      page,
      size,
      totalPages: Math.ceil(total / size),
    };
  }
}
