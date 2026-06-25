import * as fabric from 'fabric';

/**
 * 瘦脸滤镜 — 基于 gpupixel Local Translation Warp (LTW) 算法
 *
 * 核心思路（对应 gpupixel FaceReshapeFilter）：
 * 1. 以人脸下颌轮廓关键点（JAWLINE 18 点）作为控制点
 * 2. 每个控制点计算一个向面部中心收缩的 target 点
 * 3. Fragment Shader 对每个像素计算到所有控制点的距离，加权混合位移量
 * 4. 权重函数：四次方光滑衰减，在控制点处最强、边界处平滑归零
 *
 * 参考：https://github.com/pixpark/gpupixel
 */

/** 控制点数量上限（匹配 JAWLINE 18 点），同时满足 WebGL 1.0 数组 uniform 限制 */
const MAX_POINTS = 18;

interface FaceSlimOwnProps {
  strength: number;
  /** 面部中心 UV */
  faceCenter: [number, number];
  /** 控制点 UV 坐标数组 */
  controlPoints: number[];   // [x0,y0, x1,y1, ...] 长度 MAX_POINTS*2
  /** 各控制点向内收缩的目标偏移量 (delta = target - control)，UV 空间 */
  deltas: number[];          // [dx0,dy0, dx1,dy1, ...] 长度 MAX_POINTS*2
  /** 各控制点的影响半径（归一化 UV） */
  radii: number[];           // 长度 MAX_POINTS
  /** 实际有效控制点数 */
  pointCount: number;
}

export class FaceSlimFilter extends fabric.filters.BaseFilter<'FaceSlim', FaceSlimOwnProps> {
  static type = 'FaceSlim';

  // 标量 uniform 由 fabric.js 自动解析；数组元素 uniform 在 sendUniformData 中手动处理
  static uniformLocations = ['uStrength', 'uFaceCenter', 'uPointCount'];

  declare strength: number;
  declare faceCenter: [number, number];
  declare controlPoints: number[];
  declare deltas: number[];
  declare radii: number[];
  declare pointCount: number;

  static defaults = {
    strength: 0,
    faceCenter: [0.5, 0.5] as [number, number],
    controlPoints: new Array(MAX_POINTS * 2).fill(0) as number[],
    deltas: new Array(MAX_POINTS * 2).fill(0) as number[],
    radii: new Array(MAX_POINTS).fill(0.01) as number[],
    pointCount: 0,
  };

  getFragmentSource(): string {
    const N = MAX_POINTS;
    return /* glsl */ `
      precision highp float;
      uniform sampler2D uTexture;
      uniform float uStrength;
      uniform vec2 uFaceCenter;
      uniform vec2 uControlPoints[${N}];
      uniform vec2 uDeltas[${N}];
      uniform float uRadii[${N}];
      uniform int uPointCount;
      varying vec2 vTexCoord;

      void main() {
        vec2 coord = vTexCoord;

        if (uStrength < 0.01 || uPointCount < 1) {
          gl_FragColor = texture2D(uTexture, coord);
          return;
        }

        float sumWeight = 0.0;
        vec2 sumDelta = vec2(0.0);

        for (int i = 0; i < ${N}; i++) {
          if (i >= uPointCount) break;

          float d = distance(coord, uControlPoints[i]);
          float r = uRadii[i];

          if (d < r) {
            // gpupixel 风格权重函数：四次方光滑衰减
            // t = d/r  →  [0, 1],  在控制点=0，边界=1
            float t = d / r;
            // (1 - t²)²  — 中心强、边界平滑归零，四次方确保无缝过渡
            float w = 1.0 - t * t;
            w = w * w;

            sumWeight += w;
            sumDelta += w * uDeltas[i] * uStrength;
          }
        }

        if (sumWeight > 0.001) {
          coord = coord + sumDelta / sumWeight;
        }

        coord = clamp(coord, 0.0, 1.0);
        gl_FragColor = texture2D(uTexture, coord);
      }
    `;
  }

  getCacheKey(): string {
    return `${this.type}_${this.strength.toFixed(2)}_${this.pointCount}`;
  }

  isNeutralState(): boolean {
    return this.strength === 0 || this.pointCount === 0;
  }

  sendUniformData(
    gl: WebGLRenderingContext,
    uniformLocations: Record<string, WebGLUniformLocation>,
  ): void {
    gl.uniform1f(uniformLocations.uStrength, this.strength);
    gl.uniform2f(uniformLocations.uFaceCenter, this.faceCenter[0], this.faceCenter[1]);
    gl.uniform1i(uniformLocations.uPointCount, this.pointCount);

    // 传递数组 uniform — 每个数组元素单独设置
    const cpLoc = uniformLocations.uControlPoints;
    const dtLoc = uniformLocations.uDeltas;
    const rdLoc = uniformLocations.uRadii;

    for (let i = 0; i < MAX_POINTS; i++) {
      const cx = this.controlPoints[i * 2] ?? 0;
      const cy = this.controlPoints[i * 2 + 1] ?? 0;
      const dx = this.deltas[i * 2] ?? 0;
      const dy = this.deltas[i * 2 + 1] ?? 0;
      const r = this.radii[i] ?? 0.01;

      gl.uniform2f(
        gl.getUniformLocation(gl.getParameter(gl.CURRENT_PROGRAM), `uControlPoints[${i}]`),
        cx,
        cy,
      );
      gl.uniform2f(
        gl.getUniformLocation(gl.getParameter(gl.CURRENT_PROGRAM), `uDeltas[${i}]`),
        dx,
        dy,
      );
      gl.uniform1f(
        gl.getUniformLocation(gl.getParameter(gl.CURRENT_PROGRAM), `uRadii[${i}]`),
        r,
      );
    }
  }

  applyTo2d(options: any): void {
    const { imageData } = options;
    if (!imageData || this.strength <= 0 || this.pointCount <= 0) return;

    const src = new Uint8ClampedArray(imageData.data);
    const data = imageData.data as Uint8ClampedArray;
    const width = imageData.width as number;
    const height = imageData.height as number;

    const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

    // 预计算像素坐标下的控制点与偏移量
    const cpPx: { x: number; y: number }[] = [];
    const deltaPx: { x: number; y: number }[] = [];
    const radiiPx: number[] = [];

    for (let i = 0; i < this.pointCount; i++) {
      cpPx.push({
        x: this.controlPoints[i * 2] * width,
        y: this.controlPoints[i * 2 + 1] * height,
      });
      // delta 在 UV 空间定义，转换为像素空间
      deltaPx.push({
        x: this.deltas[i * 2] * width * this.strength,
        y: this.deltas[i * 2 + 1] * height * this.strength,
      });
      radiiPx.push(this.radii[i] * Math.max(width, height));
    }

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let sumWeight = 0;
        let sumDx = 0;
        let sumDy = 0;

        for (let i = 0; i < this.pointCount; i++) {
          const dx = x - cpPx[i].x;
          const dy = y - cpPx[i].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          const r = radiiPx[i];

          if (d < r) {
            const t = d / r;
            const w = (1 - t * t) ** 2;
            sumWeight += w;
            sumDx += w * deltaPx[i].x;
            sumDy += w * deltaPx[i].y;
          }
        }

        if (sumWeight > 0.001) {
          const sx = clamp(Math.round(x + sumDx / sumWeight), 0, width - 1);
          const sy = clamp(Math.round(y + sumDy / sumWeight), 0, height - 1);
          const idx = (y * width + x) * 4;
          const si = (sy * width + sx) * 4;
          data[idx] = src[si];
          data[idx + 1] = src[si + 1];
          data[idx + 2] = src[si + 2];
        }
      }
    }
  }
}
