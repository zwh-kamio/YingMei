import * as fabric from 'fabric';
import type { BeautyParams, FaceData, NormalizedLandmark } from '../../beautify/types';
import { FACE_OVAL, LEFT_EYE_CONTOUR, RIGHT_EYE_CONTOUR } from '../../beautify/landmarks';
import { setPanelFilters, resetPanelFilters } from '../ImageFilters';
import { SkinSmoothFilter } from './SkinSmoothFilter';
import { SkinWhitenFilter } from './SkinWhitenFilter';
import { EyeEnlargeFilter } from './EyeEnlargeFilter';
import { FaceSlimFilter } from './FaceSlimFilter';

/**
 * 根据美颜参数和人脸数据创建滤镜数组并应用到图片
 *
 * @param image - Fabric.js 背景图片对象
 * @param params - 美颜参数
 * @param faceData - 人脸检测结果（null 则使用降级全局滤镜）
 */
export function applyBeautifyFilters(
  image: fabric.FabricImage,
  params: BeautyParams,
  faceData: FaceData | null,
): void {
  if (!faceData) {
    // 降级：使用现有全局滤镜
    applyFallbackFilters(image, params);
    return;
  }

  const filters: fabric.filters.BaseFilter<any>[] = [];
  const { landmarks, skinMask, imageWidth, imageHeight } = faceData;

  // 只取第一张脸
  const face = landmarks[0];
  if (!face) {
    applyFallbackFilters(image, params);
    return;
  }

  // 磨皮
  if (params.smooth > 0 && skinMask) {
    filters.push(
      new SkinSmoothFilter({
        strength: params.smooth / 100,
        skinMask,
      }),
    );
  }

  // 美白
  if (params.whiten > 0 && skinMask) {
    filters.push(
      new SkinWhitenFilter({
        strength: params.whiten / 100,
        skinMask,
      }),
    );
  }

  // 大眼
  if (params.bigEye > 0 && face) {
    const leftCenter = eyeCenter(face, LEFT_EYE_CONTOUR);
    const rightCenter = eyeCenter(face, RIGHT_EYE_CONTOUR);
    const eyeRadius = computeEyeRadius(face, LEFT_EYE_CONTOUR, RIGHT_EYE_CONTOUR);

    if (leftCenter && rightCenter && eyeRadius > 0) {
      filters.push(
        new EyeEnlargeFilter({
          strength: params.bigEye / 100,
          leftEyeCenter: [leftCenter.x, leftCenter.y],
          rightEyeCenter: [rightCenter.x, rightCenter.y],
          eyeRadius,
        }),
      );
    }
  }

  // 瘦脸：用面部轮廓计算椭圆参数（中心 + 半轴长）
  if (params.thinFace > 0 && face) {
    // 使用鼻梁根部（landmark 168）作为面部中心，比下颌中心更准确
    const nose = face[168];
    const faceCtr = nose
      ? { x: nose.x, y: nose.y }
      : faceCenter(face, FACE_OVAL);

    if (faceCtr) {
      // 从面部轮廓计算椭圆半径（覆盖整个面部的椭圆）
      let maxDx = 0.04, maxDy = 0.04;
      for (const i of FACE_OVAL) {
        if (!face[i]) continue;
        const dx = Math.abs(face[i].x - faceCtr.x);
        const dy = Math.abs(face[i].y - faceCtr.y);
        if (dx > maxDx) maxDx = dx;
        if (dy > maxDy) maxDy = dy;
      }

      filters.push(
        new FaceSlimFilter({
          strength: params.thinFace / 100,
          faceCenter: [faceCtr.x, faceCtr.y],
          radiusX: maxDx * 1.15,   // 稍大于轮廓宽
          radiusY: maxDy * 1.1,    // 稍大于轮廓高
        }),
      );
    }
  }

  setPanelFilters(image, 'beautify', filters);
}

// ========== 人脸关键点计算 ==========

/** 计算眼部轮廓的中心点 */
function eyeCenter(
  face: NormalizedLandmark[],
  eyeIndices: number[],
): { x: number; y: number } | null {
  let sumX = 0, sumY = 0, count = 0;
  for (const i of eyeIndices) {
    if (face[i]) {
      sumX += face[i].x;
      sumY += face[i].y;
      count++;
    }
  }
  return count > 0 ? { x: sumX / count, y: sumY / count } : null;
}

/** 计算眼部半径（基于眼轮廓最大范围） */
function computeEyeRadius(
  face: NormalizedLandmark[],
  leftIndices: number[],
  rightIndices: number[],
): number {
  let maxDist = 0;
  const leftC = eyeCenter(face, leftIndices);
  const rightC = eyeCenter(face, rightIndices);

  for (const indices of [leftIndices, rightIndices]) {
    const center = indices === leftIndices ? leftC : rightC;
    if (!center) continue;
    for (const i of indices) {
      if (!face[i]) continue;
      const d = Math.sqrt((face[i].x - center.x) ** 2 + (face[i].y - center.y) ** 2);
      maxDist = Math.max(maxDist, d);
    }
  }

  return maxDist * 1.6; // 扩大覆盖范围确保边缘平滑
}

/** 面部中心（下颌线关键点的几何中心） */
function faceCenter(
  face: NormalizedLandmark[],
  indices: number[],
): { x: number; y: number } | null {
  let sumX = 0, sumY = 0, count = 0;
  for (const i of indices) {
    if (face[i]) {
      sumX += face[i].x;
      sumY += face[i].y;
      count++;
    }
  }
  return count > 0 ? { x: sumX / count, y: sumY / count } : null;
}

// ========== 降级滤镜（无人脸时使用）==========

function applyFallbackFilters(image: fabric.FabricImage, params: BeautyParams): void {
  const filters: fabric.filters.BaseFilter<any>[] = [];

  if (params.smooth > 0) {
    filters.push(new fabric.filters.Blur({ blur: (params.smooth / 100) * 1.5 }));
    const s = params.smooth / 100;
    filters.push(new fabric.filters.Convolute({
      matrix: [0, -s * 0.25, 0, -s * 0.25, 1 + s, -s * 0.25, 0, -s * 0.25, 0],
    }));
  }

  if (params.whiten > 0) {
    filters.push(new fabric.filters.Brightness({ brightness: (params.whiten / 100) * 0.3 }));
    filters.push(new fabric.filters.Saturation({ saturation: (params.whiten / 100) * -0.2 }));
  }

  setPanelFilters(image, 'beautify', filters);
}

/** 清除美颜滤镜 */
export function clearBeautifyFilters(image: fabric.FabricImage): void {
  resetPanelFilters(image, 'beautify');
}
