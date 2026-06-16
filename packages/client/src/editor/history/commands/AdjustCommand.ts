import type { Command } from '../HistoryManager';
import type { AdjustParams } from '../../../types';
import type * as fabric from 'fabric';
import { applyAdjustFilters, getOriginalParams } from '../../filters/ImageFilters';

/**
 * 参数调节命令：记录调整前后的参数状态
 */
export class AdjustCommand implements Command {
  type = 'adjust';

  constructor(
    private canvas: fabric.Canvas,
    private oldParams: AdjustParams,
    private newParams: AdjustParams,
  ) {}

  execute(): void {
    this.applyParams(this.newParams);
  }

  undo(): void {
    this.applyParams(this.oldParams);
  }

  private applyParams(params: AdjustParams): void {
    const bgImage = this.canvas.getObjects().find((o: any) => o.name === 'background') as fabric.FabricImage | undefined;
    if (bgImage) {
      applyAdjustFilters(bgImage, params);
      this.canvas.renderAll();
    }
  }
}
