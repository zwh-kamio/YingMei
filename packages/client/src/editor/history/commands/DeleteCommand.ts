import type * as fabric from 'fabric';
import type { Command } from '../HistoryManager';

/**
 * 删除对象命令：记录被删除的对象以便 undo 恢复
 */
export class DeleteCommand implements Command {
  type = 'delete';

  constructor(
    private canvas: fabric.Canvas,
    private removedObjects: fabric.FabricObject[],
  ) {}

  execute(): void {
    this.removedObjects.forEach((obj) => this.canvas.remove(obj));
    this.canvas.renderAll();
  }

  undo(): void {
    this.removedObjects.forEach((obj) => this.canvas.add(obj));
    this.canvas.renderAll();
  }
}
