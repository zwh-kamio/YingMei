import type * as fabric from 'fabric';
import type { Command } from '../HistoryManager';

interface ObjectTransform {
  targetId: string;
  left: number;
  top: number;
  scaleX: number;
  scaleY: number;
  angle: number;
  flipX: boolean;
  flipY: boolean;
}

/**
 * 变换命令（移动/缩放/旋转）：记录对象变换前后的状态
 */
export class TransformCommand implements Command {
  type = 'transform';

  constructor(
    private canvas: fabric.Canvas,
    private oldTransforms: ObjectTransform[],
    private newTransforms: ObjectTransform[],
  ) {}

  execute(): void {
    this.applyTransforms(this.newTransforms);
  }

  undo(): void {
    this.applyTransforms(this.oldTransforms);
  }

  private applyTransforms(transforms: ObjectTransform[]): void {
    transforms.forEach((t) => {
      const obj = this.canvas.getObjects().find((o: any) => o.name === t.targetId || (o as any).id === t.targetId);
      if (obj) {
        obj.set({
          left: t.left,
          top: t.top,
          scaleX: t.scaleX,
          scaleY: t.scaleY,
          angle: t.angle,
          flipX: t.flipX,
          flipY: t.flipY,
        });
      }
    });
    this.canvas.renderAll();
  }
}
