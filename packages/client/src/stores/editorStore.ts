import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { EditorTool, AdjustParams, CropRatio } from '../types';
import { DEFAULT_ADJUST_PARAMS } from '../types';
import type { HistoryManager } from '../editor/history/HistoryManager';

interface EditorState {
  // 当前工具
  activeTool: EditorTool;
  // 原图 URL
  originalImageUrl: string;
  // 画布对象引用（不直接序列化，运行时持有）
  canvasRef: any;
  // 原始图片 FabricImage 引用（用于对比原图功能）
  originalImageRef: any;
  // 裁剪比例
  cropRatio: CropRatio;
  // 裁剪旋转角度
  cropRotation: number;
  // 镜像翻转
  flipX: boolean;
  flipY: boolean;
  // 参数调节
  adjustParams: AdjustParams;
  // 缩放比例
  zoom: number;
  // 历史管理器引用
  historyManager: HistoryManager | null;
  // 可撤销/重做状态
  canUndo: boolean;
  canRedo: boolean;
  // 是否正在处理
  isProcessing: boolean;
  // 裁剪操作回调（由 CropOverlay 注册，CropPanel 调用）
  cropHandlers: { confirm: () => void; reset: () => void } | null;
  // AI 消除遮罩导出
  removeMaskExport: { getMaskDataUrl: () => string; clearMask: () => void; setBrushSize: (size: number) => void } | null;

  // Actions
  setActiveTool: (tool: EditorTool) => void;
  setOriginalImageUrl: (url: string) => void;
  setCanvasRef: (ref: any) => void;
  setOriginalImageRef: (ref: any) => void;
  setCropRatio: (ratio: CropRatio) => void;
  setCropRotation: (rotation: number) => void;
  setFlipX: (flip: boolean) => void;
  setFlipY: (flip: boolean) => void;
  setAdjustParam: <K extends keyof AdjustParams>(key: K, value: AdjustParams[K]) => void;
  resetAdjustParams: () => void;
  setZoom: (zoom: number) => void;
  setHistoryManager: (manager: HistoryManager | null) => void;
  setUndoRedoState: (canUndo: boolean, canRedo: boolean) => void;
  setIsProcessing: (processing: boolean) => void;
  setCropHandlers: (handlers: { confirm: () => void; reset: () => void } | null) => void;
  setRemoveMaskExport: (exportFn: { getMaskDataUrl: () => string; clearMask: () => void; setBrushSize: (size: number) => void } | null) => void;
  reset: () => void;
}

const initialState = {
  activeTool: 'select' as EditorTool,
  originalImageUrl: '',
  canvasRef: null,
  originalImageRef: null,
  cropRatio: 'free' as CropRatio,
  cropRotation: 0,
  flipX: false,
  flipY: false,
  adjustParams: { ...DEFAULT_ADJUST_PARAMS },
  zoom: 1,
  historyManager: null,
  canUndo: false,
  canRedo: false,
  isProcessing: false,
  cropHandlers: null,
  removeMaskExport: null,
};

export const useEditorStore = create<EditorState>()(
  immer((set) => ({
    ...initialState,

    setActiveTool: (tool) =>
      set((state) => {
        state.activeTool = tool;
      }),

    setOriginalImageUrl: (url) =>
      set((state) => {
        state.originalImageUrl = url;
      }),

    setCanvasRef: (ref) =>
      set((state) => {
        state.canvasRef = ref;
      }),

    setOriginalImageRef: (ref) =>
      set((state) => {
        state.originalImageRef = ref;
      }),

    setCropRatio: (ratio) =>
      set((state) => {
        state.cropRatio = ratio;
      }),

    setCropRotation: (rotation) =>
      set((state) => {
        state.cropRotation = rotation;
      }),

    setFlipX: (flip) =>
      set((state) => {
        state.flipX = flip;
      }),

    setFlipY: (flip) =>
      set((state) => {
        state.flipY = flip;
      }),

    setAdjustParam: (key, value) =>
      set((state) => {
        state.adjustParams[key] = value;
      }),

    resetAdjustParams: () =>
      set((state) => {
        state.adjustParams = { ...DEFAULT_ADJUST_PARAMS };
      }),

    setZoom: (zoom) =>
      set((state) => {
        state.zoom = zoom;
      }),

    setHistoryManager: (manager) =>
      set((state) => {
        state.historyManager = manager;
      }),

    setUndoRedoState: (canUndo, canRedo) =>
      set((state) => {
        state.canUndo = canUndo;
        state.canRedo = canRedo;
      }),

    setIsProcessing: (processing) =>
      set((state) => {
        state.isProcessing = processing;
      }),

    setCropHandlers: (handlers) =>
      set((state) => {
        state.cropHandlers = handlers;
      }),

    setRemoveMaskExport: (exportFn) =>
      set((state) => {
        state.removeMaskExport = exportFn;
      }),

    reset: () =>
      set((state) => {
        Object.assign(state, initialState);
      }),
  })),
);
