import * as fabric from 'fabric';

/**
 * 命令模式：封装一个可撤销的操作
 */
export interface Command {
  type: string;
  execute(): void;
  undo(): void;
}

/**
 * 历史管理器：双栈 (undoStack / redoStack)
 * 最大深度 50，支持批量操作合并
 */
export class HistoryManager {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];
  private maxDepth = 50;
  private canvas: fabric.Canvas;
  private onChangeCallback: (canUndo: boolean, canRedo: boolean) => void;
  private isUndoingOrRedoing = false;

  // 批量模式：连续操作合并为一个命令
  private batchMode = false;
  private batchCommands: Command[] = [];
  private batchType = '';

  constructor(canvas: fabric.Canvas, onChange: (canUndo: boolean, canRedo: boolean) => void) {
    this.canvas = canvas;
    this.onChangeCallback = onChange;
  }

  /** 执行命令并推入历史栈 */
  execute(command: Command) {
    if (this.isUndoingOrRedoing) return;

    command.execute();

    if (this.batchMode) {
      this.batchCommands.push(command);
    } else {
      this.undoStack.push(command);
      this.redoStack = [];
      this.trimStack();
    }

    this.notify();
  }

  /** 撤销 */
  undo() {
    if (this.undoStack.length === 0) return;

    this.isUndoingOrRedoing = true;
    const command = this.undoStack.pop()!;
    command.undo();
    this.redoStack.push(command);
    this.isUndoingOrRedoing = false;

    this.canvas.renderAll();
    this.notify();
  }

  /** 重做 */
  redo() {
    if (this.redoStack.length === 0) return;

    this.isUndoingOrRedoing = true;
    const command = this.redoStack.pop()!;
    command.execute();
    this.undoStack.push(command);
    this.isUndoingOrRedoing = false;

    this.canvas.renderAll();
    this.notify();
  }

  /** 开始批量模式（如滑块连续拖动） */
  beginBatch(type: string) {
    this.batchMode = true;
    this.batchType = type;
    this.batchCommands = [];
  }

  /** 结束批量模式，合并为一个 CompositeCommand */
  endBatch() {
    this.batchMode = false;
    if (this.batchCommands.length > 0) {
      const composite = new CompositeCommand(this.batchType, this.batchCommands);
      this.undoStack.push(composite);
      this.redoStack = [];
      this.trimStack();
      this.batchCommands = [];
      this.notify();
    }
  }

  /** 保存画布当前状态（用于保存/恢复状态，非命令模式） */
  saveState() {
    // 初始加载后记录基线状态，此处清除历史
    this.undoStack = [];
    this.redoStack = [];
    this.notify();
  }

  /** 获取当前状态 */
  getState() {
    return {
      canUndo: this.undoStack.length > 0,
      canRedo: this.redoStack.length > 0,
      undoCount: this.undoStack.length,
      redoCount: this.redoStack.length,
    };
  }

  destroy() {
    this.undoStack = [];
    this.redoStack = [];
    this.batchCommands = [];
  }

  private trimStack() {
    while (this.undoStack.length > this.maxDepth) {
      this.undoStack.shift();
    }
  }

  private notify() {
    this.onChangeCallback(this.undoStack.length > 0, this.redoStack.length > 0);
  }
}

/**
 * 组合命令：将多个命令合并为一个事务
 */
export class CompositeCommand implements Command {
  type: string;

  constructor(type: string, private commands: Command[]) {
    this.type = type;
  }

  execute() {
    this.commands.forEach((cmd) => cmd.execute());
  }

  undo() {
    // 逆序撤销
    for (let i = this.commands.length - 1; i >= 0; i--) {
      this.commands[i].undo();
    }
  }
}
