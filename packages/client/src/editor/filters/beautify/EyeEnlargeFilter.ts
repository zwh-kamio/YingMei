import * as fabric from 'fabric';

interface EyeEnlargeOwnProps {
  strength: number;       // 0-1
  leftEyeCenter: [number, number];   // 归一化 UV 坐标 [x, y]
  rightEyeCenter: [number, number];  // 归一化 UV 坐标 [x, y]
  eyeRadius: number;      // 归一化半径
}

/**
 * 大眼滤镜：以眼部中心为原点做 UV 坐标膨胀形变
 */
export class EyeEnlargeFilter extends fabric.filters.BaseFilter<'EyeEnlarge', EyeEnlargeOwnProps> {
  static type = 'EyeEnlarge';
  static uniformLocations = [
    'uStrength',
    'uLeftEyeCenter',
    'uRightEyeCenter',
    'uEyeRadius',
  ];

  declare strength: number;
  declare leftEyeCenter: [number, number];
  declare rightEyeCenter: [number, number];
  declare eyeRadius: number;

  static defaults = {
    strength: 0,
    leftEyeCenter: [0, 0] as [number, number],
    rightEyeCenter: [0, 0] as [number, number],
    eyeRadius: 0.05,
  };

  getFragmentSource(): string {
    return /* glsl */ `
      precision highp float;
      uniform sampler2D uTexture;
      uniform float uStrength;
      uniform vec2 uLeftEyeCenter;
      uniform vec2 uRightEyeCenter;
      uniform float uEyeRadius;
      varying vec2 vTexCoord;

      void main() {
        vec2 coord = vTexCoord;

        // 检查是否在左眼区域内
        float leftDist = distance(coord, uLeftEyeCenter);
        if (leftDist < uEyeRadius && uStrength > 0.01) {
          // 二次衰减函数，中心膨胀最大，边缘平滑过渡
          float factor = 1.0 - leftDist / uEyeRadius;
          float warp = uStrength * 0.12 * factor * factor;
          vec2 offset = (coord - uLeftEyeCenter) * warp;
          coord = coord - offset;
        }

        // 检查是否在右眼区域内
        float rightDist = distance(coord, uRightEyeCenter);
        if (rightDist < uEyeRadius && uStrength > 0.01) {
          float factor = 1.0 - rightDist / uEyeRadius;
          float warp = uStrength * 0.12 * factor * factor;
          vec2 offset = (coord - uRightEyeCenter) * warp;
          coord = coord - offset;
        }

        // 钳制防止越界采样
        coord = clamp(coord, 0.0, 1.0);
        gl_FragColor = texture2D(uTexture, coord);
      }
    `;
  }

  getCacheKey(): string {
    return `${this.type}_${this.strength.toFixed(2)}_${this.leftEyeCenter.join(',')}_${this.rightEyeCenter.join(',')}`;
  }

  isNeutralState(): boolean {
    return this.strength === 0;
  }

  sendUniformData(
    gl: WebGLRenderingContext,
    uniformLocations: Record<string, WebGLUniformLocation>,
  ): void {
    gl.uniform1f(uniformLocations.uStrength, this.strength);
    gl.uniform2f(uniformLocations.uLeftEyeCenter, this.leftEyeCenter[0], this.leftEyeCenter[1]);
    gl.uniform2f(uniformLocations.uRightEyeCenter, this.rightEyeCenter[0], this.rightEyeCenter[1]);
    gl.uniform1f(uniformLocations.uEyeRadius, this.eyeRadius);
  }

  applyTo2d(options: any): void {
    const { imageData } = options;
    if (!imageData || this.strength <= 0) return;

    const src = new Uint8ClampedArray(imageData.data);
    const data = imageData.data as Uint8ClampedArray;
    const width = imageData.width as number;
    const height = imageData.height as number;

    const px = (uv: [number, number]): [number, number] => [uv[0] * width, uv[1] * height];
    const [lcx, lcy] = px(this.leftEyeCenter);
    const [rcx, rcy] = px(this.rightEyeCenter);
    const radius = this.eyeRadius * Math.max(width, height);

    const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let sx = x, sy = y;

        // 左眼形变
        const ldx = x - lcx;
        const ldy = y - lcy;
        const ld = Math.sqrt(ldx * ldx + ldy * ldy);
        if (ld < radius) {
          const factor = 1 - ld / radius;
          const warp = this.strength * 0.12 * factor * factor;
          sx -= ldx * warp;
          sy -= ldy * warp;
        }

        // 右眼形变
        const rdx = x - rcx;
        const rdy = y - rcy;
        const rd = Math.sqrt(rdx * rdx + rdy * rdy);
        if (rd < radius) {
          const factor = 1 - rd / radius;
          const warp = this.strength * 0.12 * factor * factor;
          sx -= rdx * warp;
          sy -= rdy * warp;
        }

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
