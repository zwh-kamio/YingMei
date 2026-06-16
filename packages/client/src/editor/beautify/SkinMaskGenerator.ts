import type { NormalizedLandmark } from './types';
import {
  FACE_OVAL,
  LEFT_EYE_CONTOUR,
  RIGHT_EYE_CONTOUR,
  LIPS_OUTER,
  LEFT_EYEBROW,
  RIGHT_EYEBROW,
} from './landmarks';

/**
 * 根据 468 人脸关键点生成肤色遮罩 Canvas
 *
 * 策略：
 * 1. 填充面部轮廓多边形（皮肤区域）
 * 2. 挖掉眼部、嘴唇、眉毛区域
 * 3. 对遮罩边缘做高斯模糊，实现平滑过渡
 */
export function generateSkinMask(
  landmarks: NormalizedLandmark[],
  imageWidth: number,
  imageHeight: number,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = imageWidth;
  canvas.height = imageHeight;
  const ctx = canvas.getContext('2d')!;

  // 转为像素坐标
  const toPixel = (lm: NormalizedLandmark): [number, number] => [
    lm.x * imageWidth,
    lm.y * imageHeight,
  ];

  // 1. 填充面部轮廓
  drawPolygon(ctx, FACE_OVAL.map(i => toPixel(landmarks[i])), 'white');

  // 2. 挖掉非皮肤区域
  ctx.globalCompositeOperation = 'destination-out';
  drawPolygon(ctx, LEFT_EYE_CONTOUR.map(i => toPixel(landmarks[i])), 'black');
  drawPolygon(ctx, RIGHT_EYE_CONTOUR.map(i => toPixel(landmarks[i])), 'black');
  drawPolygon(ctx, LIPS_OUTER.map(i => toPixel(landmarks[i])), 'black');
  drawPolygon(ctx, LEFT_EYEBROW.map(i => toPixel(landmarks[i])), 'black');
  drawPolygon(ctx, RIGHT_EYEBROW.map(i => toPixel(landmarks[i])), 'black');
  ctx.globalCompositeOperation = 'source-over';

  // 3. 边缘羽化（高斯模糊）
  return applyFeather(canvas, Math.max(imageWidth, imageHeight) * 0.015);
}

/** 绘制填充多边形 */
function drawPolygon(
  ctx: CanvasRenderingContext2D,
  points: [number, number][],
  color: string,
): void {
  if (points.length < 3) return;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i][0], points[i][1]);
  }
  ctx.closePath();
  ctx.fill();
}

/** 对画布做高斯模糊，返回新 Canvas */
function applyFeather(canvas: HTMLCanvasElement, radius: number): HTMLCanvasElement {
  // 使用 CSS filter 快速模糊
  const result = document.createElement('canvas');
  result.width = canvas.width;
  result.height = canvas.height;
  const ctx = result.getContext('2d')!;
  ctx.filter = `blur(${Math.max(radius, 2)}px)`;
  ctx.drawImage(canvas, 0, 0);
  ctx.filter = 'none';
  return result;
}
