/**
 * LUT 滤镜预设定义
 * 每个预设有 name, category, 和对应的颜色映射参数
 * 完整的 3D LUT 功能在 M2 WebGL 着色器中实现，这里先用 ColorMatrix 模拟常见效果
 */

export interface FilterPreset {
  id: string;
  name: string;
  category: 'natural' | 'film' | 'japanese' | 'bw' | 'vintage' | 'food';
  /** ColorMatrix 5x4 矩阵，用于模拟 LUT 效果 */
  matrix: number[];
  /** 默认强度 */
  defaultIntensity: number;
}

export const filterPresets: FilterPreset[] = [
  // 自然
  {
    id: 'natural-warm',
    name: '暖阳',
    category: 'natural',
    matrix: [1.1, 0, 0, 0, 0.02, 0, 1.05, 0, 0, 0.01, 0, 0, 0.95, 0, 0, 0, 0, 0, 1, 0],
    defaultIntensity: 60,
  },
  {
    id: 'natural-fresh',
    name: '清新',
    category: 'natural',
    matrix: [1.05, 0, 0, 0, 0, 0, 1.08, 0, 0, 0, 0, 0, 1.05, 0, 0, 0, 0, 0, 1, 0],
    defaultIntensity: 50,
  },
  // 胶片
  {
    id: 'film-fade',
    name: '褪色胶片',
    category: 'film',
    matrix: [0.9, 0, 0, 0, 0.05, 0, 0.88, 0, 0, 0.04, 0, 0, 0.85, 0, 0.05, 0, 0, 0, 1, 0],
    defaultIntensity: 70,
  },
  {
    id: 'film-blue',
    name: '电影蓝',
    category: 'film',
    matrix: [0.85, 0, 0.1, 0, 0.02, 0, 0.9, 0.05, 0, 0.01, 0.05, 0, 0.95, 0, 0.03, 0, 0, 0, 1, 0],
    defaultIntensity: 60,
  },
  // 日系
  {
    id: 'jp-pale',
    name: '日系淡彩',
    category: 'japanese',
    matrix: [1.02, 0, 0, 0, 0.03, 0, 1.02, 0, 0, 0.02, 0, 0, 0.98, 0, 0.01, 0, 0, 0, 1, 0],
    defaultIntensity: 50,
  },
  {
    id: 'jp-cyan',
    name: '日系青蓝',
    category: 'japanese',
    matrix: [0.92, 0, 0, 0, 0.04, 0, 0.95, 0, 0, 0.02, 0.05, 0, 1.02, 0, 0.01, 0, 0, 0, 1, 0],
    defaultIntensity: 55,
  },
  // 黑白
  {
    id: 'bw-classic',
    name: '经典黑白',
    category: 'bw',
    matrix: [0.33, 0.33, 0.33, 0, 0, 0.33, 0.33, 0.33, 0, 0, 0.33, 0.33, 0.33, 0, 0, 0, 0, 0, 1, 0],
    defaultIntensity: 80,
  },
  {
    id: 'bw-high',
    name: '高对比黑白',
    category: 'bw',
    matrix: [0.4, 0.4, 0.4, 0, -0.05, 0.3, 0.3, 0.3, 0, -0.02, 0.3, 0.3, 0.3, 0, -0.02, 0, 0, 0, 1, 0],
    defaultIntensity: 75,
  },
  // 复古
  {
    id: 'vintage-sepia',
    name: '怀旧褐',
    category: 'vintage',
    matrix: [0.9, 0, 0, 0, 0.04, 0, 0.78, 0, 0, 0.03, 0, 0, 0.6, 0, 0.06, 0, 0, 0, 1, 0],
    defaultIntensity: 65,
  },
  // 美食
  {
    id: 'food-vivid',
    name: '美食鲜艳',
    category: 'food',
    matrix: [1.15, 0, 0, 0, 0, 0, 1.1, 0, 0, 0, 0, 0, 0.95, 0, 0, 0, 0, 0, 1, 0],
    defaultIntensity: 55,
  },
];

export const categoryLabels: Record<FilterPreset['category'], string> = {
  natural: '自然',
  film: '胶片',
  japanese: '日系',
  bw: '黑白',
  vintage: '复古',
  food: '美食',
};
