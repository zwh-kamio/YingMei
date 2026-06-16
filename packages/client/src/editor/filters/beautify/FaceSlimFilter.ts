import * as fabric from 'fabric';

/**
 * 瘦脸滤镜：沿下颌轮廓向内推 UV 坐标
 *
 * 策略：
 * 1. 接收一组下颌轮廓关键点（归一化 UV 坐标）
 * 2. 对每个像素计算到最近轮廓段的距离
 * 3. 在轮廓带宽度内的像素向内（面部中心）偏移
 * 4. 衰减随距离增加而平滑下降
 */

/** 瘦脸适用的轮廓点最大数量（GLSL uniform 限制） */
const MAX_CONTOUR_POINTS = 16;

interface FaceSlimOwnProps {
  strength: number;       // 0-1
  contourPoints: [number, number][];  // 下颌轮廓点，归一化 UV
  slimWidth: number;      // 瘦脸影响带宽度（归一化）
  faceCenter: [number, number];  // 面部中心 UV
}

export class FaceSlimFilter extends fabric.filters.BaseFilter<'FaceSlim', FaceSlimOwnProps> {
  static type = 'FaceSlim';
  static uniformLocations = [
    'uStrength',
    'uContourPoints',
    'uPointCount',
    'uSlimWidth',
    'uFaceCenter',
  ];

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

  getFragmentSource(): string {
    return /* glsl */ `
      precision highp float;
      uniform sampler2D uTexture;
      uniform float uStrength;
      uniform vec2 uContourPoints[${MAX_CONTOUR_POINTS}];
      uniform int uPointCount;
      uniform float uSlimWidth;
      uniform vec2 uFaceCenter;
      varying vec2 vTexCoord;

      // 点到线段的距离
      float distToSegment(vec2 p, vec2 a, vec2 b) {
        vec2 ab = b - a;
        vec2 ap = p - a;
        float t = clamp(dot(ap, ab) / dot(ab, ab), 0.0, 1.0);
        vec2 closest = a + t * ab;
        return distance(p, closest);
      }

      void main() {
        vec2 coord = vTexCoord;

        if (uStrength < 0.01 || uPointCount < 2) {
          gl_FragColor = texture2D(uTexture, coord);
          return;
        }

        // 计算到最近轮廓线段的距离
        float minDist = 1.0;
        for (int i = 0; i < ${MAX_CONTOUR_POINTS} - 1; i++) {
          if (i >= uPointCount - 1) break;
          float d = distToSegment(coord, uContourPoints[i], uContourPoints[i + 1]);
          minDist = min(minDist, d);
        }

        if (minDist < uSlimWidth) {
          // 平滑衰减：越接近轮廓线，推力越大
          float factor = 1.0 - minDist / uSlimWidth;
          float warp = uStrength * 0.08 * factor * factor;

          // 推向面部中心
          vec2 direction = normalize(uFaceCenter - coord);
          coord = coord + direction * warp;
        }

        coord = clamp(coord, 0.0, 1.0);
        gl_FragColor = texture2D(uTexture, coord);
      }
    `;
  }

  getCacheKey(): string {
    return `${this.type}_${this.strength.toFixed(2)}_${this.contourPoints.length}`;
  }

  isNeutralState(): boolean {
    return this.strength === 0 || this.contourPoints.length < 2;
  }

  sendUniformData(
    gl: WebGLRenderingContext,
    uniformLocations: Record<string, WebGLUniformLocation>,
  ): void {
    gl.uniform1f(uniformLocations.uStrength, this.strength);
    gl.uniform1f(uniformLocations.uSlimWidth, this.slimWidth);
    gl.uniform2f(uniformLocations.uFaceCenter, this.faceCenter[0], this.faceCenter[1]);
    gl.uniform1i(uniformLocations.uPointCount, Math.min(this.contourPoints.length, MAX_CONTOUR_POINTS));

    // 填充轮廓点数组（不足的补零）
    const pts = new Float32Array(MAX_CONTOUR_POINTS * 2);
    for (let i = 0; i < Math.min(this.contourPoints.length, MAX_CONTOUR_POINTS); i++) {
      pts[i * 2] = this.contourPoints[i][0];
      pts[i * 2 + 1] = this.contourPoints[i][1];
    }
    gl.uniform2fv(uniformLocations.uContourPoints, pts);
  }

  applyTo2d(options: any): void {
    const { imageData } = options;
    if (!imageData || this.strength <= 0 || this.contourPoints.length < 2) return;

    const src = new Uint8ClampedArray(imageData.data);
    const data = imageData.data as Uint8ClampedArray;
    const width = imageData.width as number;
    const height = imageData.height as number;

    // 归一化 → 像素坐标
    const toPx = (uv: [number, number]): [number, number] => [uv[0] * width, uv[1] * height];
    const pxContour = this.contourPoints.map(toPx);
    const [fcx, fcy] = toPx(this.faceCenter);
    const slimPx = this.slimWidth * Math.max(width, height);

    const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

    // 点到线段像素距离
    const segDist = (x: number, y: number, ax: number, ay: number, bx: number, by: number): number => {
      const abx = bx - ax, aby = by - ay;
      const apx = x - ax, apy = y - ay;
      const dot = apx * abx + apy * aby;
      const lenSq = abx * abx + aby * aby;
      const t = clamp(dot / lenSq, 0, 1);
      const cpx = ax + t * abx, cpy = ay + t * aby;
      return Math.sqrt((x - cpx) ** 2 + (y - cpy) ** 2);
    };

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // 最近轮廓距离
        let minDist = Infinity;
        for (let i = 0; i < pxContour.length - 1; i++) {
          const d = segDist(x, y, pxContour[i][0], pxContour[i][1], pxContour[i + 1][0], pxContour[i + 1][1]);
          minDist = Math.min(minDist, d);
        }

        if (minDist >= slimPx) continue;

        const factor = 1 - minDist / slimPx;
        const warp = this.strength * 0.08 * factor * factor;

        // 向面部中心推
        const dx = fcx - x;
        const dy = fcy - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 0.001) continue;
        const nx = dx / dist, ny = dy / dist;

        let sx = x + nx * warp * Math.max(width, height);
        let sy = y + ny * warp * Math.max(width, height);
        sx = clamp(sx, 0, width - 1);
        sy = clamp(sy, 0, height - 1);

        const idx = (y * width + x) * 4;
        const si = (Math.round(sy) * width + Math.round(sx)) * 4;
        data[idx] = src[si];
        data[idx + 1] = src[si + 1];
        data[idx + 2] = src[si + 2];
      }
    }
  }
}
