import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useEditorStore } from '../../stores/editorStore';
import { CROP_RATIO_MAP, type CropRatio } from '../../types';
import * as fabric from 'fabric';

interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function CropOverlay() {
  const overlayRef = useRef<HTMLDivElement>(null);
  const canvasRef = useEditorStore((s) => s.canvasRef);
  const cropRatio = useEditorStore((s) => s.cropRatio);
  const cropRotation = useEditorStore((s) => s.cropRotation);
  const flipX = useEditorStore((s) => s.flipX);
  const flipY = useEditorStore((s) => s.flipY);
  const setActiveTool = useEditorStore((s) => s.setActiveTool);
  const setCropHandlers = useEditorStore((s) => s.setCropHandlers);
  const historyManager = useEditorStore((s) => s.historyManager);

  const [cropRect, setCropRect] = useState<CropRect>({ x: 50, y: 50, width: 200, height: 200 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragCorner, setDragCorner] = useState<string | null>(null);
  const dragStart = useRef({ x: 0, y: 0, rect: { x: 0, y: 0, width: 0, height: 0 } });

  // 用 ref 存最新值，避免闭包过时
  const cropRectRef = useRef(cropRect);
  cropRectRef.current = cropRect;
  const canvasRefRef = useRef(canvasRef);
  canvasRefRef.current = canvasRef;
  const setActiveToolRef = useRef(setActiveTool);
  setActiveToolRef.current = setActiveTool;

  // 根据比例约束尺寸
  const constrainRect = useCallback(
    (rect: CropRect, ratioStr: CropRatio): CropRect => {
      const ratio = CROP_RATIO_MAP[ratioStr];
      if (!ratio) return rect;
      const newWidth = Math.max(50, rect.width);
      const newHeight = newWidth / ratio;
      return { ...rect, width: newWidth, height: Math.max(50, newHeight) };
    },
    [],
  );

  // 初始化裁剪区域
  useEffect(() => {
    const canvas = canvasRef as fabric.Canvas;
    if (!canvas) return;
    const cw = canvas.getWidth();
    const ch = canvas.getHeight();
    const r = Math.min(cw, ch) * 0.6;
    const rect = constrainRect(
      { x: (cw - r) / 2, y: (ch - r) / 2, width: r, height: r },
      cropRatio,
    );
    setCropRect(rect);
  }, [cropRatio, canvasRef, constrainRect]);

  // ============ 裁剪确认逻辑 ============
  const confirmCrop = useCallback(() => {
    const canvas = canvasRefRef.current as fabric.Canvas;
    if (!canvas) return;

    const bgImage = canvas.getObjects().find((o: any) => o.name === 'background') as fabric.FabricImage | undefined;
    if (!bgImage) return;

    const rect = cropRectRef.current;
    const cw = canvas.getWidth();
    const ch = canvas.getHeight();
    const scaleX = bgImage.scaleX || 1;
    const scaleY = bgImage.scaleY || 1;

    // 将屏幕坐标转换为图片坐标
    const imgCropX = (rect.x - (bgImage.left || 0)) / scaleX;
    const imgCropY = (rect.y - (bgImage.top || 0)) / scaleY;
    const imgCropW = rect.width / scaleX;
    const imgCropH = rect.height / scaleY;

    (bgImage as any).set({
      cropX: imgCropX,
      cropY: imgCropY,
      width: imgCropW,
      height: imgCropH,
    });

    // 裁剪后居中：显示尺寸 = imgCropW * scaleX = rect.width
    const displayW = imgCropW * scaleX;
    const displayH = imgCropH * scaleY;

    bgImage.set({
      left: (cw - displayW) / 2,
      top: (ch - displayH) / 2,
      scaleX: scaleX,
      scaleY: scaleY,
    });

    canvas.renderAll();
    setActiveToolRef.current('select');
  }, []);

  const resetCrop = useCallback(() => {
    const canvas = canvasRefRef.current as fabric.Canvas;
    if (!canvas) return;
    const bgImage = canvas.getObjects().find((o: any) => o.name === 'background') as fabric.FabricImage | undefined;
    if (!bgImage) return;

    (bgImage as any).set({ cropX: 0, cropY: 0, width: undefined, height: undefined });
    // 还原原始居中位置
    const cw = canvas.getWidth();
    const ch = canvas.getHeight();
    const imgW = ((bgImage as any)._originalWidth || bgImage.width) * (bgImage.scaleX || 1);
    const imgH = ((bgImage as any)._originalHeight || bgImage.height) * (bgImage.scaleY || 1);
    bgImage.set({
      left: (cw - imgW) / 2,
      top: (ch - imgH) / 2,
    });
    canvas.renderAll();
  }, []);

  // 向 store 注册裁剪确认/重置回调，供 CropPanel 调用
  useEffect(() => {
    setCropHandlers({ confirm: confirmCrop, reset: resetCrop });
    return () => setCropHandlers(null);
  }, [confirmCrop, resetCrop, setCropHandlers]);

  // ============ 鼠标交互 ============
  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const corner = target.dataset.corner;
    if (corner) {
      setDragCorner(corner);
      setIsDragging(true);
      dragStart.current = { x: e.clientX, y: e.clientY, rect: { ...cropRectRef.current } };
    } else {
      // 拖动整个裁剪框
      setIsDragging(true);
      setDragCorner('move');
      dragStart.current = { x: e.clientX, y: e.clientY, rect: { ...cropRectRef.current } };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    const orig = dragStart.current.rect;

    let newRect = { ...cropRectRef.current };

    switch (dragCorner) {
      case 'move':
        newRect.x = orig.x + dx;
        newRect.y = orig.y + dy;
        break;
      case 'nw':
        newRect.x = orig.x + dx;
        newRect.y = orig.y + dy;
        newRect.width = orig.width - dx;
        newRect.height = orig.height - dy;
        break;
      case 'ne':
        newRect.y = orig.y + dy;
        newRect.width = orig.width + dx;
        newRect.height = orig.height - dy;
        break;
      case 'sw':
        newRect.x = orig.x + dx;
        newRect.width = orig.width - dx;
        newRect.height = orig.height + dy;
        break;
      case 'se':
        newRect.width = orig.width + dx;
        newRect.height = orig.height + dy;
        break;
    }

    newRect = constrainRect(newRect, cropRatio);
    setCropRect(newRect);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragCorner(null);
  };

  return (
    <div
      ref={overlayRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{
        position: 'absolute',
        inset: 0,
        cursor: isDragging ? 'grabbing' : 'default',
        zIndex: 10,
      }}
    >
      {/* 半透明遮罩 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
        }}
      />

      {/* 裁剪区域（透明窗口） */}
      <div
        style={{
          position: 'absolute',
          left: cropRect.x,
          top: cropRect.y,
          width: cropRect.width,
          height: cropRect.height,
          border: '2px dashed #fff',
          boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
          cursor: 'move',
        }}
      >
        {/* 四角拖拽手柄 */}
        {['nw', 'ne', 'sw', 'se'].map((corner) => (
          <div
            key={corner}
            data-corner={corner}
            style={{
              position: 'absolute',
              width: 14,
              height: 14,
              background: '#fff',
              border: '2px solid #FF6B81',
              borderRadius: 2,
              ...{
                nw: { top: -7, left: -7, cursor: 'nwse-resize' },
                ne: { top: -7, right: -7, cursor: 'nesw-resize' },
                sw: { bottom: -7, left: -7, cursor: 'nesw-resize' },
                se: { bottom: -7, right: -7, cursor: 'nwse-resize' },
              }[corner],
            }}
          />
        ))}
      </div>

      {/* 确认/取消按钮 */}
      <div
        style={{
          position: 'absolute',
          bottom: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: 12,
          zIndex: 20,
        }}
      >
        <button
          onClick={resetCrop}
          style={{
            padding: '8px 24px',
            borderRadius: 20,
            border: '1px solid rgba(255,255,255,0.5)',
            background: 'rgba(0,0,0,0.5)',
            color: '#fff',
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          重置
        </button>
        <button
          onClick={confirmCrop}
          style={{
            padding: '8px 28px',
            borderRadius: 20,
            border: 'none',
            background: '#FF6B81',
            color: '#fff',
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          确认裁剪
        </button>
      </div>
    </div>
  );
}
