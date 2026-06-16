import type * as fabric from 'fabric';
import type { Command } from '../HistoryManager';

/**
 * 添加对象命令（文字/贴纸等）：undo 时移除对象
 */
export class AddObjectCommand implements Command {
  type = 'add-object';

  constructor(
    private canvas: fabric.Canvas,
    private object: fabric.FabricObject,
  ) {}

  execute(): void {
    this.canvas.add(this.object);
    this.canvas.setActiveObject(this.object);
    this.canvas.renderAll();
  }

  undo(): void {
    this.canvas.remove(this.object);
    this.canvas.renderAll();
  }
}
