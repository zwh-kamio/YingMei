import * as fabric from 'fabric';

interface SkinSmoothOwnProps {
  strength: number;
  skinMask: HTMLCanvasElement;
}

/**
 * 磨皮滤镜
 * - WebGL 路径：全局双边滤波近似（无遮罩，兼容 Fabric.js 渲染管线）
 * - Canvas2D 路径：肤色遮罩区域内双边滤波近似
 */
export class SkinSmoothFilter extends fabric.filters.BaseFilter<'SkinSmooth', SkinSmoothOwnProps> {
  static type = 'SkinSmooth';
  static uniformLocations = ['uStrength'];

  declare strength: number;
  declare skinMask: HTMLCanvasElement;

  static defaults = { strength: 0, skinMask: null };

  getFragmentSource(): string {
    return /* glsl */ `
      precision highp float;
      uniform sampler2D uTexture;
      uniform float uStrength;
      varying vec2 vTexCoord;

      void main() {
        vec4 color = texture2D(uTexture, vTexCoord);
        if (uStrength < 0.01) {
          gl_FragColor = color;
          return;
        }
        vec2 step = vec2(0.004);
        float totalWeight = 0.0;
        vec3 blurred = vec3(0.0);
        for (int x = -2; x <= 2; x++) {
          for (int y = -2; y <= 2; y++) {
            vec2 offset = vec2(float(x), float(y)) * step;
            vec3 sampleColor = texture2D(uTexture, vTexCoord + offset).rgb;
            float spatialWeight = 1.0 - (abs(float(x)) + abs(float(y))) / 6.0;
            float colorDiff = distance(color.rgb, sampleColor);
            float rangeWeight = 1.0 - smoothstep(0.0, 0.3, colorDiff);
            float weight = spatialWeight * rangeWeight;
            blurred += sampleColor * weight;
            totalWeight += weight;
          }
        }
        blurred /= max(totalWeight, 1.0);
        gl_FragColor = vec4(mix(color.rgb, blurred, uStrength), color.a);
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
  }

  applyTo2d(options: any): void {
    const { imageData } = options;
    if (!imageData || this.strength <= 0) return;

    const data = imageData.data as Uint8ClampedArray;
    const width = imageData.width as number;
    const height = imageData.height as number;
    const temp = new Uint8ClampedArray(data);

    // 有遮罩时仅处理肤色区域
    let maskData: Uint8ClampedArray | null = null;
    let maskW = 0, maskH = 0;
    if (this.skinMask) {
      const maskCtx = this.skinMask.getContext('2d');
      if (maskCtx) {
        maskData = maskCtx.getImageData(0, 0, this.skinMask.width, this.skinMask.height).data;
        maskW = this.skinMask.width;
        maskH = this.skinMask.height;
      }
    }

    const kernelRadius = 3;
    const maxDist = kernelRadius * 2 + 1;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // 遮罩检查
        if (maskData) {
          const mx = Math.floor((x / width) * maskW);
          const my = Math.floor((y / height) * maskH);
          const maskAlpha = maskData[(my * maskW + mx) * 4 + 3] / 255;
          if (maskAlpha < 0.05) continue;
        }

        const idx = (y * width + x) * 4;
        let r = 0, g = 0, b = 0, totalWeight = 0;

        for (let ky = -kernelRadius; ky <= kernelRadius; ky++) {
          for (let kx = -kernelRadius; kx <= kernelRadius; kx++) {
            const sx = x + kx, sy = y + ky;
            if (sx < 0 || sy < 0 || sx >= width || sy >= height) continue;
            const si = (sy * width + sx) * 4;
            const spatialWeight = 1.0 - (Math.abs(kx) + Math.abs(ky)) / maxDist;
            const colorDiff = (Math.abs(temp[idx] - temp[si]) + Math.abs(temp[idx + 1] - temp[si + 1]) + Math.abs(temp[idx + 2] - temp[si + 2])) / 3 / 255;
            const rangeWeight = 1.0 - Math.min(colorDiff / 0.3, 1);
            const weight = spatialWeight * rangeWeight;
            r += temp[si] * weight;
            g += temp[si + 1] * weight;
            b += temp[si + 2] * weight;
            totalWeight += weight;
          }
        }

        if (totalWeight > 0) {
          const s = maskData
            ? this.strength * (maskData[(Math.floor((y / height) * maskW) * maskW + Math.floor((x / width) * maskW)) * 4 + 3] / 255)
            : this.strength;
          data[idx] = temp[idx] * (1 - s) + (r / totalWeight) * s;
          data[idx + 1] = temp[idx + 1] * (1 - s) + (g / totalWeight) * s;
          data[idx + 2] = temp[idx + 2] * (1 - s) + (b / totalWeight) * s;
        }
      }
    }
  }
}
