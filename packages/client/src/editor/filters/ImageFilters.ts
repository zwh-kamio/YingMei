import * as fabric from 'fabric';
import type { AdjustParams } from '../../types';

/** 面板滤镜 tag 标识 */
type PanelTag = 'adjust' | 'beautify' | 'filter';

/**
 * 将面板滤镜合并到目标图层的滤镜管道中
 * — 先移除该面板旧滤镜，再追加新滤镜，不影响其他面板的滤镜
 */
export function setPanelFilters(
  image: fabric.FabricImage,
  panel: PanelTag,
  filters: fabric.filters.BaseFilter<any>[],
): void {
  const existing = (image.filters || []).filter((f: any) => f._panel !== panel);
  filters.forEach((f: any) => (f._panel = panel));
  image.filters = [...existing, ...filters];
  image.applyFilters();
}

/**
 * 移除指定面板的全部滤镜
 */
export function resetPanelFilters(
  image: fabric.FabricImage,
  panel: PanelTag,
): void {
  image.filters = (image.filters || []).filter((f: any) => f._panel !== panel);
  image.applyFilters();
}

/**
 * 将 adjustParams 映射为 Fabric.js 滤镜数组并应用到背景图
 * Fabric.js 6.x 使用 fabric.Image.filters 命名空间下的滤镜类
 */
export function applyAdjustFilters(
  image: fabric.FabricImage,
  params: AdjustParams,
): void {
  const filters: fabric.filters.BaseFilter<any>[] = [];

  // 亮度 -100 ~ 100 → Fabric Brightness (-1 ~ 1)
  if (params.brightness !== 0) {
    filters.push(new fabric.filters.Brightness({ brightness: params.brightness / 100 }));
  }

  // 对比度 -100 ~ 100 → Fabric Contrast (-1 ~ 1)
  if (params.contrast !== 0) {
    filters.push(new fabric.filters.Contrast({ contrast: params.contrast / 100 }));
  }

  // 饱和度 -100 ~ 100 → Fabric Saturation (-1 ~ 1)
  if (params.saturation !== 0) {
    filters.push(new fabric.filters.Saturation({ saturation: params.saturation / 100 }));
  }

  // 色温：通过 ColorMatrix 调整蓝/黄通道
  if (params.temperature !== 0) {
    const t = params.temperature / 100;
    // 暖色调增强红、减弱蓝；冷色调反之
    const temperatureMatrix = [
      1 + t * 0.2, 0, 0, 0, 0,
      0, 1, 0, 0, 0,
      0, 0, 1 - t * 0.2, 0, 0,
      0, 0, 0, 1, 0,
    ];
    filters.push(new fabric.filters.ColorMatrix({ matrix: temperatureMatrix }));
  }

  // 高光：混合模式调整亮部
  if (params.highlights !== 0) {
    const h = params.highlights / 100;
    const highlightMatrix = [
      1, 0, 0, 0, h * 0.3,
      0, 1, 0, 0, h * 0.3,
      0, 0, 1, 0, h * 0.3,
      0, 0, 0, 1, 0,
    ];
    filters.push(new fabric.filters.ColorMatrix({ matrix: highlightMatrix }));
  }

  // 阴影：混合模式调整暗部
  if (params.shadows !== 0) {
    const s = params.shadows / 100;
    const shadowMatrix = [
      1 + s * 0.3, 0, 0, 0, s * -0.15,
      0, 1 + s * 0.3, 0, 0, s * -0.15,
      0, 0, 1 + s * 0.3, 0, s * -0.15,
      0, 0, 0, 1, 0,
    ];
    filters.push(new fabric.filters.ColorMatrix({ matrix: shadowMatrix }));
  }

  // 锐化：使用 Convolute 滤镜
  if (params.sharpen > 0) {
    const strength = params.sharpen / 100;
    const center = 1 + 4 * strength;
    const edge = -strength;
    filters.push(
      new fabric.filters.Convolute({
        matrix: [
          0, edge, 0,
          edge, center, edge,
          0, edge, 0,
        ],
      }),
    );
  }

  // 降噪/模糊
  if (params.denoise > 0) {
    filters.push(new fabric.filters.Blur({ blur: (params.denoise / 100) * 2 }));
  }

  // 使用面板合并，不影响其他面板（beautify / filter）的滤镜
  setPanelFilters(image, 'adjust', filters);
}

/**
 * 获取调整前的原图参数
 */
export function getOriginalParams(): AdjustParams {
  return {
    brightness: 0,
    contrast: 0,
    saturation: 0,
    temperature: 0,
    highlights: 0,
    shadows: 0,
    sharpen: 0,
    denoise: 0,
  };
}
