import React, { useRef, useEffect, useCallback } from 'react';
import * as fabric from 'fabric';
import { message } from 'antd';
import { useEditorStore } from '../../stores/editorStore';
import { HistoryManager } from '../history/HistoryManager';
import { applyAdjustFilters } from '../filters/ImageFilters';
import { AdjustCommand } from '../history/commands/AdjustCommand';
import { DeleteCommand } from '../history/commands/DeleteCommand';
import { AddObjectCommand } from '../history/commands/AddObjectCommand';
import type { AdjustParams } from '../../types';
import { DEFAULT_ADJUST_PARAMS } from '../../types';

/** 生成唯一 ID */
let objIdCounter = 0;
function nextId(): string {
  return `obj_${Date.now()}_${++objIdCounter}`;
}

export default function FabricCanvas() {
  const canvasEl = useRef<HTMLCanvasElement>(null);
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const isAdjusting = useRef(false);

  const originalImageUrl = useEditorStore((s) => s.originalImageUrl);
  const activeTool = useEditorStore((s) => s.activeTool);
  const adjustParams = useEditorStore((s) => s.adjustParams);
  const cropRotation = useEditorStore((s) => s.cropRotation);
  const flipX = useEditorStore((s) => s.flipX);
  const flipY = useEditorStore((s) => s.flipY);
  const setCanvasRef = useEditorStore((s) => s.setCanvasRef);
  const setZoom = useEditorStore((s) => s.setZoom);
  const setHistoryManager = useEditorStore((s) => s.setHistoryManager);
  const setUndoRedoState = useEditorStore((s) => s.setUndoRedoState);
  const setActiveTool = useEditorStore((s) => s.setActiveTool);
  const setOriginalImageRef = useEditorStore((s) => s.setOriginalImageRef);
  const historyManager = useEditorStore((s) => s.historyManager);

  // 获取背景图
  const getBackgroundImage = useCallback((): fabric.FabricImage | null => {
    if (!fabricRef.current) return null;
    return (fabricRef.current.getObjects().find((o: any) => o.name === 'background') as fabric.FabricImage) || null;
  }, []);

  // 获取背景图在画布上的边界
  const getImageBounds = useCallback((): { left: number; top: number; right: number; bottom: number } | null => {
    const bg = getBackgroundImage();
    if (!bg) return null;
    const left = bg.left ?? 0;
    const top = bg.top ?? 0;
    const w = bg.width * (bg.scaleX ?? 1);
    const h = bg.height * (bg.scaleY ?? 1);
    return { left, top, right: left + w, bottom: top + h };
  }, [getBackgroundImage]);

  // 判断点是否在图片区域内
  const isInsideImage = useCallback((x: number, y: number) => {
    const bounds = getImageBounds();
    if (!bounds) return false;
    return x >= bounds.left && x <= bounds.right && y >= bounds.top && y <= bounds.bottom;
  }, [getImageBounds]);

  // ============ 初始化画布 ============
  useEffect(() => {
    if (!canvasEl.current) return;

    const wrapper = canvasWrapperRef.current!;
    const canvas = new fabric.Canvas(canvasEl.current, {
      width: wrapper.clientWidth,
      height: wrapper.clientHeight,
      backgroundColor: '#2a2a3e',
      preserveObjectStacking: true,
      stopContextMenu: true,
      fireRightClick: true,
    });

    fabricRef.current = canvas;
    setCanvasRef(canvas);

    const hm = new HistoryManager(canvas, (canUndo, canRedo) => {
      setUndoRedoState(canUndo, canRedo);
    });
    setHistoryManager(hm);

    // 鼠标滚轮缩放
    canvas.on('mouse:wheel', (opt) => {
      const delta = (opt.e as WheelEvent).deltaY;
      let zoom = canvas.getZoom();
      zoom *= 0.999 ** delta;
      zoom = Math.min(Math.max(zoom, 0.1), 5);
      canvas.zoomToPoint(
        new fabric.Point((opt.e as WheelEvent).offsetX, (opt.e as WheelEvent).offsetY),
        zoom,
      );
      setZoom(zoom);
      opt.e.preventDefault();
      opt.e.stopPropagation();
    });

    // 对象变换时记录状态（用于 TransformCommand）
    let transformBefore: Record<string, any> = {};
    (canvas as any).on('object:modifying', () => {
      const active = canvas.getActiveObject();
      if (active) {
        transformBefore[(active as any).name || (active as any).id || ''] = {
          left: active.left,
          top: active.top,
          scaleX: active.scaleX,
          scaleY: active.scaleY,
          angle: active.angle,
          flipX: active.flipX,
          flipY: active.flipY,
        };
      }
    });

    // 窗口 resize
    const handleResize = () => {
      if (fabricRef.current && wrapper) {
        fabricRef.current.setDimensions({ width: wrapper.clientWidth, height: wrapper.clientHeight });
        fabricRef.current.renderAll();
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      hm.destroy();
      canvas.dispose();
      fabricRef.current = null;
    };
  }, []);

  // ============ 加载背景图片（响应 originalImageUrl 变化） ============
  useEffect(() => {
    const canvas = fabricRef.current;
    const wrapper = canvasWrapperRef.current;
    if (!canvas || !wrapper || !originalImageUrl) return;

    // 移除旧背景图（全部，防止残留重复）
    canvas.getObjects().filter((o: any) => o.name === 'background').forEach((o) => canvas.remove(o));

    fabric.FabricImage.fromURL(originalImageUrl, { crossOrigin: 'anonymous' }).then((img) => {
      if (!fabricRef.current) return;
      const cw = wrapper.clientWidth;
      const ch = wrapper.clientHeight;
      const scale = Math.min((cw * 0.8) / img.width, (ch * 0.8) / img.height, 1);
      img.set({
        scaleX: scale,
        scaleY: scale,
        left: (cw - img.width * scale) / 2,
        top: (ch - img.height * scale) / 2,
        selectable: false,
        evented: false,
        name: 'background',
      });
      canvas.add(img);
      canvas.renderAll();
      // 保存原始图片引用，供对比原图功能使用
      setOriginalImageRef(img);
      historyManager?.saveState();
    }).catch((err) => {
      console.error('Failed to load image:', err);
      message.error('图片加载失败');
    });
  }, [originalImageUrl, historyManager]);

  // ============ 参数调整：监听 adjustParams 变化，应用滤镜 ============
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas || activeTool !== 'adjust') return;

    const bgImage = getBackgroundImage();
    if (!bgImage) return;

    isAdjusting.current = true;
    applyAdjustFilters(bgImage, adjustParams);
    canvas.renderAll();
  }, [adjustParams, activeTool, getBackgroundImage]);

  // 参数调整开始/结束（用于批量模式合并历史）
  const adjustStartRef = useRef<AdjustParams>({ ...DEFAULT_ADJUST_PARAMS });

  // ============ 工具模式切换 ============
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    // 退出 adjust 模式时，如果参数有变化，创建 AdjustCommand
    if (isAdjusting.current) {
      const changed = Object.keys(adjustParams).some(
        (k) => adjustParams[k as keyof AdjustParams] !== adjustStartRef.current[k as keyof AdjustParams],
      );
      if (changed && historyManager) {
        const cmd = new AdjustCommand(canvas, { ...adjustStartRef.current }, { ...adjustParams });
        historyManager.execute(cmd);
      }
      isAdjusting.current = false;
    }

    canvas.getObjects().forEach((obj) => {
      if ((obj as any).name !== 'background') {
        obj.set({ selectable: false, evented: false });
      }
    });

    switch (activeTool) {
      case 'select':
        canvas.getObjects().forEach((obj) => {
          if ((obj as any).name !== 'background') {
            obj.set({ selectable: true, evented: true });
          }
        });
        canvas.selection = true;
        canvas.defaultCursor = 'default';
        break;
      case 'crop':
        canvas.selection = false;
        canvas.defaultCursor = 'crosshair';
        break;
      case 'adjust':
        adjustStartRef.current = { ...adjustParams };
        canvas.selection = false;
        break;
      case 'text':
        // 文字模式下已有文字对象可交互（选中、双击编辑），其他对象保持不可选
        canvas.getObjects().forEach((obj) => {
          if (obj instanceof fabric.IText) {
            obj.set({ selectable: true, evented: true });
          }
        });
        canvas.selection = false;
        canvas.defaultCursor = 'text';
        break;
      case 'sticker':
        canvas.selection = false;
        canvas.defaultCursor = 'copy';
        break;
      default:
        canvas.selection = false;
        canvas.defaultCursor = 'default';
        break;
    }

    canvas.renderAll();
  }, [activeTool]);

  // ============ 文字工具：点击画布添加文字 / 双击已有文字编辑 ============
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas || activeTool !== 'text') return;

    const handleTextClick = (opt: fabric.TPointerEventInfo) => {
      if (activeTool !== 'text') return;

      // 点击已有文字对象 → 交由 Fabric 内置的双击编辑机制处理，不创建新文字
      if (opt.target && opt.target instanceof fabric.IText) {
        canvas.setActiveObject(opt.target);
        canvas.renderAll();
        return;
      }

      // 点击空白区域 → 创建新文字（仅限图片区域内）
      const pointer = canvas.getScenePoint(opt.e);
      if (!isInsideImage(pointer.x, pointer.y)) return;
      const text = new fabric.IText('双击编辑文字', {
        left: pointer.x,
        top: pointer.y,
        fontSize: 40,
        fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
        fill: '#ffffff',
        stroke: '#000000',
        strokeWidth: 1,
        name: nextId(),
      });
      (text as any).id = (text as any).name;

      const cmd = new AddObjectCommand(canvas, text);
      historyManager?.execute(cmd);
      canvas.renderAll();
    };

    canvas.on('mouse:down', handleTextClick);
    return () => {
      canvas.off('mouse:down', handleTextClick);
    };
  }, [activeTool, historyManager]);

  // ============ 键盘事件：Delete 删除选中对象 ============
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const canvas = fabricRef.current;
      if (!canvas) return;

      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        const active = canvas.getActiveObject();
        if (active && (active as any).name !== 'background') {
          e.preventDefault();
          const cmd = new DeleteCommand(canvas, [active]);
          historyManager?.execute(cmd);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyManager]);

  // ============ 容器大小变化：自动居中背景图 ============
  const centerBackgroundImage = useCallback(() => {
    const canvas = fabricRef.current;
    const wrapper = canvasWrapperRef.current;
    if (!canvas || !wrapper) return;

    const bg = canvas.getObjects().find((o: any) => o.name === 'background') as fabric.FabricImage;
    if (!bg) return;

    const cw = wrapper.clientWidth;
    const ch = wrapper.clientHeight;
    const imgW = bg.width * (bg.scaleX ?? 1);
    const imgH = bg.height * (bg.scaleY ?? 1);

    bg.set({
      left: (cw - imgW) / 2,
      top: (ch - imgH) / 2,
    });
    canvas.renderAll();
  }, []);

  // 应用当前笔刷设置到遮罩 context（初始化/尺寸变化后调用）
  const applyMaskContext = useCallback(() => {
    const ctx = maskCtxRef.current;
    if (!ctx) return;
    ctx.strokeStyle = 'rgba(100,180,255,0.7)';
    ctx.lineWidth = brushSizeRef.current;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  useEffect(() => {
    const observer = new ResizeObserver(() => {
      const wrapper = canvasWrapperRef.current;
      if (!wrapper) return;

      // 更新 Fabric 画布尺寸
      if (fabricRef.current) {
        fabricRef.current.setDimensions({ width: wrapper.clientWidth, height: wrapper.clientHeight });
        centerBackgroundImage();
      }

      // 同步更新遮罩层和指示器层尺寸（重置内部像素后需重新应用笔刷设置）
      const mc = maskCanvasRef.current;
      const ic = indicatorCanvasRef.current;
      const cc = committedCanvasRef.current;
      const cctx = committedCtxRef.current;
      if (mc) {
        mc.width = wrapper.clientWidth;
        mc.height = wrapper.clientHeight;
        applyMaskContext();
      }
      if (ic) {
        ic.width = wrapper.clientWidth;
        ic.height = wrapper.clientHeight;
      }
      if (cc && cctx) {
        // 保存旧 committed 内容
        const oldData = cctx.getImageData(0, 0, Math.min(cc.width, wrapper.clientWidth), Math.min(cc.height, wrapper.clientHeight));
        cc.width = wrapper.clientWidth;
        cc.height = wrapper.clientHeight;
        // 恢复笔刷设置（resize 会重置 context）
        cctx.strokeStyle = 'rgba(100,180,255,0.7)';
        cctx.lineWidth = brushSizeRef.current;
        cctx.lineCap = 'round';
        cctx.lineJoin = 'round';
        cctx.putImageData(oldData, 0, 0);
        // 重新合成 mask
        renderMaskComposite();
      }
    });
    if (canvasWrapperRef.current) {
      observer.observe(canvasWrapperRef.current);
    }
    return () => observer.disconnect();
  }, [centerBackgroundImage, applyMaskContext]);

  // ============ AI 消除遮罩绘制 ============
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const indicatorCanvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const maskCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const indicatorCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const brushSizeRef = useRef(30);
  const mousePosRef = useRef({ x: -999, y: -999 });

  // 绘制笔刷圆环指示器到 indicator canvas
  const drawIndicator = useCallback((x: number, y: number) => {
    const ctx = indicatorCtxRef.current;
    const mc = indicatorCanvasRef.current;
    if (!ctx || !mc) return;
    const r = brushSizeRef.current / 2;

    ctx.clearRect(0, 0, mc.width, mc.height);

    // 外圈白色
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 内圈黑色（对比）
    ctx.beginPath();
    ctx.arc(x, y, Math.max(r - 3, 1), 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }, []);

  // 初始化遮罩和指示器 canvas
  const initOverlay = useCallback(() => {
    if (!maskCanvasRef.current || !indicatorCanvasRef.current || !canvasWrapperRef.current) return;
    const wrapper = canvasWrapperRef.current;
    const w = wrapper.clientWidth;
    const h = wrapper.clientHeight;

    // 遮罩层（初始显示默认光标，鼠标移到图片区域后切换为笔刷指示器）
    const mc = maskCanvasRef.current;
    mc.width = w; mc.height = h;
    mc.style.cursor = 'default';
    maskCtxRef.current = mc.getContext('2d');
    applyMaskContext();

    // 离屏 committed canvas（存档已提交笔触）
    if (!committedCanvasRef.current) {
      committedCanvasRef.current = document.createElement('canvas');
    }
    const cc = committedCanvasRef.current;
    cc.width = w; cc.height = h;
    committedCtxRef.current = cc.getContext('2d');
    if (committedCtxRef.current) {
      committedCtxRef.current.strokeStyle = 'rgba(100,180,255,0.7)';
      committedCtxRef.current.lineWidth = brushSizeRef.current;
      committedCtxRef.current.lineCap = 'round';
      committedCtxRef.current.lineJoin = 'round';
    }
    activePointsRef.current = [];

    // 指示器层
    const ic = indicatorCanvasRef.current;
    ic.width = w; ic.height = h;
    indicatorCtxRef.current = ic.getContext('2d');
  }, [applyMaskContext]);

  useEffect(() => {
    if (activeTool === 'ai-remove') {
      initOverlay();
    }
  }, [activeTool, initOverlay]);

  // 遮罩绘制
  // committedCanvas: 离屏 canvas，存档已完成笔触，保证透明度不叠加
  // activePoints: 当前笔触点序列，mouseup 时一次性 stroke 到 committedCanvas
  const committedCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const committedCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const activePointsRef = useRef<{ x: number; y: number }[]>([]);

  // 将 mask canvas 内容重置为 committed canvas（合并已提交笔触 + 当前活跃笔触）
  const renderMaskComposite = useCallback(() => {
    const ctx = maskCtxRef.current;
    const mc = maskCanvasRef.current;
    const cc = committedCanvasRef.current;
    if (!ctx || !mc || !cc) return;
    ctx.clearRect(0, 0, mc.width, mc.height);
    ctx.drawImage(cc, 0, 0);
    // 如果有活跃笔触，一次性 stroke 整个路径（无叠加）
    const pts = activePointsRef.current;
    if (pts.length > 0) {
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x, pts[i].y);
      }
      ctx.stroke();
    }
  }, []);

  // 将活跃笔触提交到 committed canvas（mouseup 时），限制最大 alpha 防叠加
  const commitActiveStroke = useCallback(() => {
    const cc = committedCanvasRef.current;
    const cctx = committedCtxRef.current;
    const pts = activePointsRef.current;
    if (!cc || !cctx || pts.length === 0) return;
    cctx.beginPath();
    cctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      cctx.lineTo(pts[i].x, pts[i].y);
    }
    cctx.stroke();
    // 遍历像素归一化，防止重复涂抹穿透叠加
    const imageData = cctx.getImageData(0, 0, cc.width, cc.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] > 0) {
        data[i] = 100;     // R
        data[i + 1] = 180; // G
        data[i + 2] = 255; // B
        data[i + 3] = 178; // A (70%)
      }
    }
    cctx.putImageData(imageData, 0, 0);
    activePointsRef.current = [];
  }, []);

  const handleMaskMouseDown = useCallback((e: React.MouseEvent) => {
    if (activeTool !== 'ai-remove') return;
    const x = e.nativeEvent.offsetX;
    const y = e.nativeEvent.offsetY;
    if (!isInsideImage(x, y)) return;
    isDrawingRef.current = true;
    activePointsRef.current = [{ x, y }];
    renderMaskComposite();
  }, [activeTool, isInsideImage, renderMaskComposite]);

  const handleMaskMouseMove = useCallback((e: React.MouseEvent) => {
    const x = e.nativeEvent.offsetX;
    const y = e.nativeEvent.offsetY;
    mousePosRef.current = { x, y };

    // 图片区域内：隐藏光标显示笔刷指示器；区域外：显示默认光标
    if (isInsideImage(x, y)) {
      drawIndicator(x, y);
      if (maskCanvasRef.current) maskCanvasRef.current.style.cursor = 'none';
    } else {
      const ctx = indicatorCtxRef.current;
      const mc = indicatorCanvasRef.current;
      if (ctx && mc) ctx.clearRect(0, 0, mc.width, mc.height);
      if (maskCanvasRef.current) maskCanvasRef.current.style.cursor = 'default';
    }

    if (!isDrawingRef.current) return;
    activePointsRef.current.push({ x, y });
    renderMaskComposite();
  }, [isInsideImage, drawIndicator, renderMaskComposite]);

  const handleMaskMouseUp = useCallback(() => {
    isDrawingRef.current = false;
    commitActiveStroke();
    renderMaskComposite();
  }, [commitActiveStroke, renderMaskComposite]);

  const handleMaskMouseEnter = useCallback((e: React.MouseEvent) => {
    const x = e.nativeEvent.offsetX;
    const y = e.nativeEvent.offsetY;
    mousePosRef.current = { x, y };
    if (isInsideImage(x, y)) {
      drawIndicator(x, y);
      if (maskCanvasRef.current) maskCanvasRef.current.style.cursor = 'none';
    } else {
      if (maskCanvasRef.current) maskCanvasRef.current.style.cursor = 'default';
    }
  }, [isInsideImage, drawIndicator]);

  const handleMaskMouseLeave = useCallback(() => {
    const ctx = indicatorCtxRef.current;
    const mc = indicatorCanvasRef.current;
    if (ctx && mc) ctx.clearRect(0, 0, mc.width, mc.height);
    isDrawingRef.current = false;
  }, []);

  const clearMask = useCallback(() => {
    const mc = maskCanvasRef.current;
    const mctx = maskCtxRef.current;
    const cc = committedCanvasRef.current;
    const cctx = committedCtxRef.current;
    if (mc && mctx) mctx.clearRect(0, 0, mc.width, mc.height);
    if (cc && cctx) cctx.clearRect(0, 0, cc.width, cc.height);
    activePointsRef.current = [];
  }, []);

  const updateBrushSize = useCallback((size: number) => {
    brushSizeRef.current = size;
    const ctx = maskCtxRef.current;
    if (ctx) {
      ctx.lineWidth = size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
    const cctx = committedCtxRef.current;
    if (cctx) {
      cctx.lineWidth = size;
      cctx.lineCap = 'round';
      cctx.lineJoin = 'round';
    }
    // 刷新指示器
    const { x, y } = mousePosRef.current;
    drawIndicator(x, y);
  }, [drawIndicator]);

  // 暴露遮罩导出接口到 store
  const setRemoveMaskExport = useEditorStore((s) => s.setRemoveMaskExport);
  useEffect(() => {
    if (activeTool === 'ai-remove') {
      setRemoveMaskExport({
        getMaskDataUrl: () => maskCanvasRef.current?.toDataURL('image/png') || '',
        clearMask,
        setBrushSize: updateBrushSize,
      });
    }
    return () => setRemoveMaskExport(null);
  }, [activeTool, setRemoveMaskExport, clearMask, updateBrushSize]);

  return (
    <div ref={canvasWrapperRef} style={{ width: '100%', height: '100%', overflow: 'hidden', position: 'relative' }}>
      <canvas ref={canvasEl} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />
      {activeTool === 'ai-remove' && (
        <>
          <canvas
            ref={maskCanvasRef}
            className="overlay-canvas"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              zIndex: 10,
              cursor: 'none',
            }}
            onMouseDown={handleMaskMouseDown}
            onMouseMove={handleMaskMouseMove}
            onMouseUp={handleMaskMouseUp}
            onMouseEnter={handleMaskMouseEnter}
            onMouseLeave={handleMaskMouseLeave}
          />
          <canvas
            ref={indicatorCanvasRef}
            className="overlay-canvas"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              zIndex: 11,
              pointerEvents: 'none',
            }}
          />
        </>
      )}
    </div>
  );
}
