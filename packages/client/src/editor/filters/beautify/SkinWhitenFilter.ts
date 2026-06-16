import * as fabric from 'fabric';

interface SkinWhitenOwnProps {
  strength: number;
  skinMask: HTMLCanvasElement;
}

/**
 * 美白滤镜
 * - WebGL 路径：全局提亮+降饱和
 * - Canvas2D 路径：肤色遮罩区域内提亮+降饱和
 */
export class SkinWhitenFilter extends fabric.filters.BaseFilter<'SkinWhiten', SkinWhitenOwnProps> {
  static type = 'SkinWhiten';
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
        // 提亮
        vec3 brightened = color.rgb + uStrength * 0.15;
        // 降饱和
        float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
        vec3 desaturated = mix(color.rgb, vec3(gray), uStrength * 0.2);
        vec3 result = mix(color.rgb, mix(brightened, desaturated, 0.5), uStrength);
        gl_FragColor = vec4(result, color.a);
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

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const s = maskData
          ? this.strength * (maskData[(Math.floor((y / height) * maskW) * maskW + Math.floor((x / width) * maskW)) * 4 + 3] / 255)
          : this.strength;
        if (s < 0.01) continue;

        const idx = (y * width + x) * 4;
        // 提亮
        data[idx] = Math.min(255, data[idx] * (1 + s * 0.15));
        data[idx + 1] = Math.min(255, data[idx + 1] * (1 + s * 0.15));
        data[idx + 2] = Math.min(255, data[idx + 2] * (1 + s * 0.15));
        // 降饱和
        const gray = data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114;
        data[idx] = data[idx] * (1 - s * 0.2) + gray * s * 0.2;
        data[idx + 1] = data[idx + 1] * (1 - s * 0.2) + gray * s * 0.2;
        data[idx + 2] = data[idx + 2] * (1 - s * 0.2) + gray * s * 0.2;
      }
    }
  }
}
