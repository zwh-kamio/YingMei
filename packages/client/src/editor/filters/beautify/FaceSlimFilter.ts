import * as fabric from 'fabric';

/**
 * 瘦脸滤镜：沿下颌轮廓向内推 UV 坐标（仅 Canvas2D 路径）
 *
 * GLSL uniform 数组在 Fabric.js 渲染管线中不稳定，故 WebGL 路径使用默认透传，
 * 实际形变逻辑在 applyTo2d 中实现。
 */

interface FaceSlimOwnProps {
  strength: number;
  contourPoints: [number, number][];
  slimWidth: number;
  faceCenter: [number, number];
}

export class FaceSlimFilter extends fabric.filters.BaseFilter<'FaceSlim', FaceSlimOwnProps> {
  static type = 'FaceSlim';
  static uniformLocations: string[] = [];

  declare strength: number;
  declare contourPoints: [number, number][];
  declare slimWidth: number;
  declare faceCenter: [number, number];

  static defaults = {
    strength: 0,
    contourPoints: [] as [number, number][],
    slimWidth: 0.08,
    faceCenter: [0.5, 0.5] as [number, number],
  };

  isNeutralState(): boolean {
    return this.strength === 0 || this.contourPoints.length < 2;
  }

  applyTo2d(options: any): void {
    const { imageData } = options;
    if (!imageData || this.strength <= 0 || this.contourPoints.length < 2) return;

    const src = new Uint8ClampedArray(imageData.data);
    const data = imageData.data as Uint8ClampedArray;
    const width = imageData.width as number;
    const height = imageData.height as number;

    // 归一化 → 像素坐标
    const toPx = (uv: [number, number]): [number, number] => [
      uv[0] * width,
      uv[1] * height,
    ];
    const pxContour = this.contourPoints.map(toPx);
    const [fcx, fcy] = toPx(this.faceCenter);
    const slimPx = this.slimWidth * Math.max(width, height);

    const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

    // 点到线段距离
    const segDist = (
      px: number, py: number,
      ax: number, ay: number,
      bx: number, by: number,
    ): number => {
      const abx = bx - ax, aby = by - ay;
      const apx = px - ax, apy = py - ay;
      const dot = apx * abx + apy * aby;
      const lenSq = abx * abx + aby * aby;
      if (lenSq < 0.0001) return Math.sqrt(apx * apx + apy * apy);
      const t = clamp(dot / lenSq, 0, 1);
      const cpx = ax + t * abx, cpy = ay + t * aby;
      return Math.sqrt((px - cpx) ** 2 + (py - cpy) ** 2);
    };

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let minDist = Infinity;
        for (let i = 0; i < pxContour.length - 1; i++) {
          const d = segDist(
            x, y,
            pxContour[i][0], pxContour[i][1],
            pxContour[i + 1][0], pxContour[i + 1][1],
          );
          if (d < minDist) minDist = d;
        }

        if (minDist >= slimPx) continue;

        const factor = 1 - minDist / slimPx;
        const warp = this.strength * 0.08 * factor * factor;

        const dx = fcx - x;
        const dy = fcy - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 0.5) continue;
        const nx = dx / dist, ny = dy / dist;

        let sx = x + nx * warp * Math.max(width, height);
        let sy = y + ny * warp * Math.max(width, height);
        sx = clamp(Math.round(sx), 0, width - 1);
        sy = clamp(Math.round(sy), 0, height - 1);

        const idx = (y * width + x) * 4;
        const si = (sy * width + sx) * 4;
        data[idx] = src[si];
        data[idx + 1] = src[si + 1];
        data[idx + 2] = src[si + 2];
      }
    }
  }
}
