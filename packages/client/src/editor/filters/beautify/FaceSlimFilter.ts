import * as fabric from 'fabric';

/**
 * 瘦脸滤镜：面部区域像素向内（面部中心）收缩
 *
 * 策略：
 * - 以面部中心为原点，椭圆区域内的像素沿径向向内偏移
 * - 力场在椭圆边缘最强，向中心平滑衰减（二次衰减函数）
 * - WebGL：单纹理着色器，uniform 传中心+椭圆轴长
 * - Canvas2D：同样逻辑的像素级实现
 */

interface FaceSlimOwnProps {
  strength: number;
  faceCenter: [number, number];    // 归一化 UV
  /** 瘦脸椭圆半轴长（归一化），面宽方向 */
  radiusX: number;
  /** 瘦脸椭圆半轴长（归一化），面高方向 */
  radiusY: number;
}

export class FaceSlimFilter extends fabric.filters.BaseFilter<'FaceSlim', FaceSlimOwnProps> {
  static type = 'FaceSlim';
  static uniformLocations = ['uStrength', 'uFaceCenter', 'uRadiusX', 'uRadiusY'];

  declare strength: number;
  declare faceCenter: [number, number];
  declare radiusX: number;
  declare radiusY: number;

  static defaults = {
    strength: 0,
    faceCenter: [0.5, 0.5] as [number, number],
    radiusX: 0.15,
    radiusY: 0.22,
  };

  getFragmentSource(): string {
    return /* glsl */ `
      precision highp float;
      uniform sampler2D uTexture;
      uniform float uStrength;
      uniform vec2 uFaceCenter;
      uniform float uRadiusX;
      uniform float uRadiusY;
      varying vec2 vTexCoord;

      void main() {
        vec2 coord = vTexCoord;

        if (uStrength < 0.01) {
          gl_FragColor = texture2D(uTexture, coord);
          return;
        }

        // 归一化到椭圆坐标系的偏移
        vec2 delta = coord - uFaceCenter;
        float en = (delta.x * delta.x) / (uRadiusX * uRadiusX)
                 + (delta.y * delta.y) / (uRadiusY * uRadiusY);

        if (en < 1.0) {
          // 在椭圆内：沿径向向内推
          // 衰减函数：边缘力最大(en→1.0)，中心力最小(en→0.0)
          float factor = en;
          float warp = uStrength * 0.06 * factor;
          float dist = length(delta);
          if (dist > 0.0001) {
            vec2 direction = delta / dist;     // 向外的径向
            coord = coord + direction * warp;  // 向外采样 → 外侧像素向内收缩
          }
        }

        coord = clamp(coord, 0.0, 1.0);
        gl_FragColor = texture2D(uTexture, coord);
      }
    `;
  }

  getCacheKey(): string {
    return `${this.type}_${this.strength.toFixed(2)}`;
  }

  isNeutralState(): boolean {
    return this.strength === 0;
  }

  sendUniformData(
    gl: WebGLRenderingContext,
    uniformLocations: Record<string, WebGLUniformLocation>,
  ): void {
    gl.uniform1f(uniformLocations.uStrength, this.strength);
    gl.uniform2f(uniformLocations.uFaceCenter, this.faceCenter[0], this.faceCenter[1]);
    gl.uniform1f(uniformLocations.uRadiusX, this.radiusX);
    gl.uniform1f(uniformLocations.uRadiusY, this.radiusY);
  }

  applyTo2d(options: any): void {
    const { imageData } = options;
    if (!imageData || this.strength <= 0) return;

    const src = new Uint8ClampedArray(imageData.data);
    const data = imageData.data as Uint8ClampedArray;
    const width = imageData.width as number;
    const height = imageData.height as number;

    const cx = this.faceCenter[0] * width;
    const cy = this.faceCenter[1] * height;
    const rx = this.radiusX * width;
    const ry = this.radiusY * height;

    const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const en = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry);

        if (en >= 1.0) continue;

        const factor = en;
        const warp = this.strength * 0.06 * factor;
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
