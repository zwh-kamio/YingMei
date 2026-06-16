import type { Command } from '../HistoryManager';
import type * as fabric from 'fabric';

interface CropState {
  left: number;
  top: number;
  scaleX: number;
  scaleY: number;
  width: number;
  height: number;
  flipX: boolean;
  flipY: boolean;
  angle: number;
  cropX?: number;
  cropY?: number;
  cropWidth?: number;
  cropHeight?: number;
}

/**
 * 裁剪命令：记录裁剪前后背景图的状态
 */
export class CropCommand implements Command {
  type = 'crop';

  constructor(
    private canvas: fabric.Canvas,
    private oldState: CropState,
    private newState: CropState,
  ) {}

  execute(): void {
    this.applyState(this.newState);
  }

  undo(): void {
    this.applyState(this.oldState);
  }

  private applyState(state: CropState): void {
    const bgImage = this.canvas.getObjects().find((o: any) => o.name === 'background') as fabric.FabricImage | undefined;
    if (!bgImage) return;

    bgImage.set({
      left: state.left,
      top: state.top,
      scaleX: state.scaleX,
      scaleY: state.scaleY,
      flipX: state.flipX,
      flipY: state.flipY,
      angle: state.angle,
    });

    // 如果有裁剪信息，应用裁剪
    if (state.cropX !== undefined) {
      (bgImage as any).cropX = state.cropX;
      (bgImage as any).cropY = state.cropY;
    }

    this.canvas.renderAll();
  }
}
