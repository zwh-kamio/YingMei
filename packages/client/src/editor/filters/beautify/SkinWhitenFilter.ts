import * as fabric from 'fabric';

interface SkinWhitenOwnProps {
  strength: number;
  skinMask: HTMLCanvasElement;
}

/**
 * 美白滤镜：肤色遮罩区域内提亮 + 微降饱和
 * - WebGL 路径：双纹理着色器，mask 限定区域
 * - Canvas2D 路径：像素级美白 + mask
 */
export class SkinWhitenFilter extends fabric.filters.BaseFilter<'SkinWhiten', SkinWhitenOwnProps> {
  static type = 'SkinWhiten';
  static uniformLocations = ['uStrength', 'uSkinMask'];

  declare strength: number;
  declare skinMask: HTMLCanvasElement;

  static defaults = { strength: 0, skinMask: null };

  getVertexSource(): string {
    return /* glsl */ `
      attribute vec2 aPosition;
      varying vec2 vTexCoord;
      varying vec2 vTexCoord2;
      void main() {
        vTexCoord = aPosition;
        vTexCoord2 = aPosition;
        gl_Position = vec4(aPosition * 2.0 - 1.0, 0.0, 1.0);
      }
    `;
  }

  getFragmentSource(): string {
    return /* glsl */ `
      precision highp float;
      uniform sampler2D uTexture;
      uniform sampler2D uSkinMask;
      uniform float uStrength;
      varying vec2 vTexCoord;
      varying vec2 vTexCoord2;

      void main() {
        vec4 color = texture2D(uTexture, vTexCoord);
        float mask = texture2D(uSkinMask, vTexCoord2).a;

        if (mask < 0.01 || uStrength < 0.01) {
          gl_FragColor = color;
          return;
        }

        float effectiveStrength = uStrength * mask;

        // 提亮
        vec3 brightened = color.rgb + effectiveStrength * 0.15;
        // 降饱和
        float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
        vec3 desaturated = mix(color.rgb, vec3(gray), effectiveStrength * 0.2);
        // 综合
        vec3 result = mix(color.rgb, mix(brightened, desaturated, 0.5), effectiveStrength);
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
    if (uniformLocations.uSkinMask) {
      gl.uniform1i(uniformLocations.uSkinMask, 1);
    }
  }

  applyToWebGL(options: any): void {
    const gl = options.context as WebGLRenderingContext;
    if (!gl || !this.skinMask) {
      super.applyToWebGL(options);
      return;
    }

    // 实例级纹理缓存，避免每帧重建
    if (!(this as any)._maskTexture) {
      const tex = gl.createTexture();
      if (!tex) { super.applyToWebGL(options); return; }
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.skinMask);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      (this as any)._maskTexture = tex;
    }

    this.bindAdditionalTexture(gl, (this as any)._maskTexture as WebGLTexture, gl.TEXTURE1);
    super.applyToWebGL(options);
    this.unbindAdditionalTexture(gl, gl.TEXTURE1);
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
        data[idx] = Math.min(255, data[idx] * (1 + s * 0.15));
        data[idx + 1] = Math.min(255, data[idx + 1] * (1 + s * 0.15));
        data[idx + 2] = Math.min(255, data[idx + 2] * (1 + s * 0.15));
        const gray = data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114;
        data[idx] = data[idx] * (1 - s * 0.2) + gray * s * 0.2;
        data[idx + 1] = data[idx + 1] * (1 - s * 0.2) + gray * s * 0.2;
        data[idx + 2] = data[idx + 2] * (1 - s * 0.2) + gray * s * 0.2;
      }
    }
  }
}
