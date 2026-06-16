import type { Command } from '../HistoryManager';
import * as fabric from 'fabric';

/**
 * 替换背景图命令：用于 AI 功能（抠图/增强/美颜）完成后的图片替换
 * 支持撤销回 AI 处理前的原始图片
 * extraRemove/extraAdd 用于伴随对象（如抠图的背景色矩形）
 */
export class ReplaceImageCommand implements Command {
  type = 'replace-image';

  private extraRemove: fabric.Object[];
  private extraAdd: fabric.Object[];

  constructor(
    private canvas: fabric.Canvas,
    private oldImage: fabric.FabricImage,
    private newImage: fabric.FabricImage,
    extraRemove: fabric.Object[] = [],
    extraAdd: fabric.Object[] = [],
  ) {
    this.extraRemove = extraRemove;
    this.extraAdd = extraAdd;
  }

  execute(): void {
    this.swapTo(this.newImage, this.extraRemove, this.extraAdd);
  }

  undo(): void {
    this.swapTo(this.oldImage, this.extraAdd, this.extraRemove);
  }

  private swapTo(
    target: fabric.FabricImage,
    toRemove: fabric.Object[],
    toAdd: fabric.Object[],
  ): void {
    // 移除全部背景图（防止残留重复对象导致"两张图"bug）和伴随对象
    const backgrounds = this.canvas
      .getObjects()
      .filter((o: any) => o.name === 'background');
    backgrounds.forEach((o) => this.canvas.remove(o));
    toRemove.forEach((o) => this.canvas.remove(o));

    // 添加新背景图和伴随对象
    toAdd.forEach((o) => this.canvas.add(o));
    this.canvas.add(target);
    (this.canvas as any).sendObjectToBack(target);
    this.canvas.renderAll();
  }
}
