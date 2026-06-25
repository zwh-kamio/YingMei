import React, { useRef, useCallback } from 'react';
import { Button, Tooltip, Space, Divider, message } from 'antd';
import {
  SelectOutlined,
  ExpandOutlined,
  SlidersOutlined,
  ExperimentOutlined,
  SmileOutlined,
  FontSizeOutlined,
  PictureOutlined,
  BorderOutlined,
  EditOutlined,
  BlockOutlined,
  ScissorOutlined,
  DeleteOutlined,
  ThunderboltOutlined,
  EyeOutlined,
  UndoOutlined,
  RedoOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import { useEditorStore } from '../../stores/editorStore';
import type { EditorTool } from '../../types';
import * as fabric from 'fabric';
import './Toolbar.css';

interface ToolItem {
  key: EditorTool;
  icon: React.ReactNode;
  label: string;
  group: 'basic' | 'adjust' | 'ai';
}

const toolGroups: { name: string; tools: ToolItem[] }[] = [
  {
    name: '基础工具',
    tools: [
      { key: 'select', icon: <SelectOutlined />, label: '选择', group: 'basic' },
      { key: 'crop', icon: <ExpandOutlined />, label: '裁剪', group: 'basic' },
    ],
  },
  {
    name: '调节',
    tools: [
      { key: 'adjust', icon: <SlidersOutlined />, label: '调色', group: 'adjust' },
      { key: 'filter', icon: <ExperimentOutlined />, label: '滤镜', group: 'adjust' },
    ],
  },
  {
    name: '美容',
    tools: [
      { key: 'beautify', icon: <SmileOutlined />, label: '美颜', group: 'adjust' },
    ],
  },
  {
    name: '元素',
    tools: [
      { key: 'text', icon: <FontSizeOutlined />, label: '文字', group: 'basic' },
      { key: 'sticker', icon: <PictureOutlined />, label: '贴纸', group: 'basic' },
      { key: 'border', icon: <BorderOutlined />, label: '边框', group: 'basic' },
    ],
  },
  {
    name: '绘图',
    tools: [
      { key: 'doodle', icon: <EditOutlined />, label: '涂鸦', group: 'basic' },
      { key: 'mosaic', icon: <BlockOutlined />, label: '马赛克', group: 'basic' },
    ],
  },
  {
    name: '智能工具',
    tools: [
      { key: 'ai-cutout', icon: <ScissorOutlined />, label: 'AI抠图', group: 'ai' },
      { key: 'ai-remove', icon: <DeleteOutlined />, label: 'AI消除', group: 'ai' },
      { key: 'ai-enhance', icon: <ThunderboltOutlined />, label: '画质增强', group: 'ai' },
    ],
  },
];

const allTools = toolGroups.flatMap((g) => g.tools);

// ============ 跨域图片代理导出 ============

/** 将远程 URL 通过后端代理转为可在当前域使用的 data URL */
async function fetchViaProxy(url: string): Promise<string> {
  const resp = await fetch(`/api/upload/proxy-image?url=${encodeURIComponent(url)}`);
  if (!resp.ok) throw new Error(`proxy fetch failed: ${resp.status}`);
  const blob = await resp.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/** 获取 FabricImage 的当前 src */
function getImageSrc(img: fabric.FabricImage): string {
  return (img as any).getSrc?.()
    || (img as any)._originalElement?.currentSrc
    || (img as any)._element?.src
    || '';
}

/**
 * 代理导出：将所有远程图片转为 data URL 后，在离屏 canvas 上逐层绘制，
 * 完全绕过 fabric 的 WebGL 纹理缓存和 toCanvasElement 的跨域限制。
 */
async function exportViaProxy(
  sourceCanvas: fabric.Canvas,
  cropLeft: number,
  cropTop: number,
  cropW: number,
  cropH: number,
): Promise<string> {
  // 收集需要代理的图片对象
  interface Layer {
    obj: fabric.FabricImage;
    dataUrl: string;
  }
  const layers: Layer[] = [];

  for (const obj of sourceCanvas.getObjects()) {
    if (!(obj instanceof fabric.FabricImage)) continue;
    const src = getImageSrc(obj);
    if (!src || src.startsWith('data:')) continue;

    const dataUrl = await fetchViaProxy(src);
    layers.push({ obj, dataUrl });
  }

  // 创建离屏 canvas，尺寸 = 图片区域
  const out = document.createElement('canvas');
  out.width = cropW;
  out.height = cropH;
  const ctx = out.getContext('2d')!;

  // 按 z-order 逐层绘制（getObjects 从底到顶）
  for (const fabricObj of sourceCanvas.getObjects()) {
    const left = (fabricObj.left ?? 0) - cropLeft;
    const top = (fabricObj.top ?? 0) - cropTop;

    if (fabricObj instanceof fabric.FabricImage) {
      // 查找是否已通过代理获取 data URL
      const layer = layers.find((l) => l.obj === fabricObj);
      const src = layer?.dataUrl || getImageSrc(fabricObj);

      if (!src) continue;

      const img = await loadImage(src);
      const sw = (fabricObj.width ?? img.width) * (fabricObj.scaleX ?? 1);
      const sh = (fabricObj.height ?? img.height) * (fabricObj.scaleY ?? 1);

      ctx.save();
      // 变换：以图片中心为原点
      const cx = left + sw / 2;
      const cy = top + sh / 2;
      ctx.translate(cx, cy);
      if (fabricObj.flipX) ctx.scale(-1, 1);
      if (fabricObj.flipY) ctx.scale(1, -1);
      if (fabricObj.angle) ctx.rotate((fabricObj.angle * Math.PI) / 180);
      ctx.globalAlpha = fabricObj.opacity ?? 1;
      ctx.drawImage(img, -sw / 2, -sh / 2, sw, sh);
      ctx.restore();
    } else if (fabricObj instanceof fabric.IText || fabricObj instanceof fabric.Text) {
      const text = fabricObj as fabric.IText;
      ctx.save();
      ctx.font = `${text.fontStyle || ''} ${text.fontWeight || ''} ${text.fontSize || 40}px ${text.fontFamily || 'sans-serif'}`;
      ctx.fillStyle = text.fill as string || '#ffffff';
      ctx.globalAlpha = text.opacity ?? 1;
      if (text.stroke && text.strokeWidth) {
        ctx.strokeStyle = text.stroke as string;
        ctx.lineWidth = text.strokeWidth;
        ctx.strokeText(text.text || '', left, top + (text.fontSize || 40));
      }
      ctx.fillText(text.text || '', left, top + (text.fontSize || 40));
      ctx.restore();
    }
  }

  return out.toDataURL('image/png');
}

/** 将 URL（data URL 或普通 URL）加载为 HTMLImageElement */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (!src.startsWith('data:')) img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export default function Toolbar() {
  const activeTool = useEditorStore((s) => s.activeTool);
  const setActiveTool = useEditorStore((s) => s.setActiveTool);
  const canUndo = useEditorStore((s) => s.canUndo);
  const canRedo = useEditorStore((s) => s.canRedo);
  const historyManager = useEditorStore((s) => s.historyManager);
  const canvasRef = useEditorStore((s) => s.canvasRef);

  const originalImageRef = useEditorStore((s) => s.originalImageRef);
  const savedImageRef = useRef<fabric.FabricImage | null>(null);

  // ============ 对比原图（长按显示原图，松开恢复） ============
  // 交换当前背景图与原始图片，适用于 AI 处理后的场景
  const showOriginal = useCallback(() => {
    const canvas = canvasRef as fabric.Canvas;
    if (!canvas || !originalImageRef) return;
    const currentBg = canvas.getObjects().find(
      (o: any) => o.name === 'background',
    ) as fabric.FabricImage | undefined;
    if (!currentBg) return;

    // 保存当前背景图引用（编辑后的），放入原图
    savedImageRef.current = currentBg;
    canvas.remove(currentBg);
    canvas.add(originalImageRef);
    (canvas as any).sendObjectToBack(originalImageRef);
    canvas.renderAll();
  }, [canvasRef, originalImageRef]);

  const restoreEdited = useCallback(() => {
    const canvas = canvasRef as fabric.Canvas;
    if (!canvas || !savedImageRef.current) return;
    const currentBg = canvas.getObjects().find(
      (o: any) => o.name === 'background',
    );
    if (currentBg) canvas.remove(currentBg);

    canvas.add(savedImageRef.current);
    (canvas as any).sendObjectToBack(savedImageRef.current);
    canvas.renderAll();
    savedImageRef.current = null;
  }, [canvasRef]);

  // ============ 下载画布为 PNG（仅导出图片区域，不含画布背景） ============
  const handleDownload = useCallback(async () => {
    const canvas = canvasRef as fabric.Canvas;
    if (!canvas) {
      message.warning('画布未就绪');
      return;
    }

    const bg = canvas.getObjects().find(
      (o: any) => o.name === 'background',
    ) as fabric.FabricImage | undefined;
    if (!bg) {
      message.warning('没有可下载的图片');
      return;
    }

    const activeObj = canvas.getActiveObject();
    canvas.discardActiveObject();

    const bgRect = bg.getBoundingRect();
    const cropLeft = bgRect.left;
    const cropTop = bgRect.top;
    const cropW = bgRect.width;
    const cropH = bgRect.height;

    const origBg = canvas.backgroundColor;
    canvas.backgroundColor = 'transparent';
    canvas.renderAll();

    let fullCanvas: HTMLCanvasElement;
    let dataUrl: string | undefined;
    try {
      // 路径 1：直接导出
      fullCanvas = canvas.toCanvasElement({ multiplier: 1, format: 'png', quality: 1 });

      // 跨域污染可能导致输出 canvas 尺寸为 0
      if (fullCanvas.width === 0 || fullCanvas.height === 0) {
        throw new DOMException('Canvas tainted', 'SecurityError');
      }

      canvas.backgroundColor = origBg;
      if (activeObj) canvas.setActiveObject(activeObj);
      canvas.renderAll();
    } catch (e) {
      canvas.backgroundColor = origBg;
      if (activeObj) canvas.setActiveObject(activeObj);
      canvas.renderAll();

      if (e instanceof DOMException && (e.name === 'SecurityError' || e.name === 'InvalidStateError')) {
        try {
          // 路径 2：通过代理获取所有远程图片，在离屏 canvas 上重建导出
          dataUrl = await exportViaProxy(canvas, cropLeft, cropTop, cropW, cropH);
        } catch (proxyErr) {
          console.error('Proxy export failed:', proxyErr);
          message.error('导出失败，请稍后重试');
          return;
        }
      } else {
        throw e;
      }
    }

    // 路径 1 成功：裁剪导出
    if (!dataUrl) {
      const crop = document.createElement('canvas');
      crop.width = cropW;
      crop.height = cropH;
      crop.getContext('2d')!.drawImage(fullCanvas, cropLeft, cropTop, cropW, cropH, 0, 0, cropW, cropH);
      dataUrl = crop.toDataURL('image/png');
    }

    const link = document.createElement('a');
    link.download = `yingmei-${Date.now()}.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    message.success('下载成功');
  }, [canvasRef]);

  return (
    <div className="editor-toolbar">
      <div className="toolbar-tools">
        {toolGroups.map((group) => (
          <React.Fragment key={group.name}>
            <div className="toolbar-group-label">{group.name}</div>
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              {group.tools.map((tool) => (
                <Tooltip title={tool.label} placement="right" key={tool.key}>
                  <Button
                    type={activeTool === tool.key ? 'primary' : 'text'}
                    icon={tool.icon}
                    onClick={() =>
                      setActiveTool(activeTool === tool.key ? 'select' : tool.key)
                    }
                    className={`toolbar-btn ${activeTool === tool.key ? 'active' : ''}`}
                    block
                  />
                </Tooltip>
              ))}
            </Space>
            <Divider style={{ margin: '8px 0', borderColor: 'rgba(255,255,255,0.1)' }} />
          </React.Fragment>
        ))}
      </div>

      {/* 底部操作按钮 */}
      <div className="toolbar-bottom">
        <Tooltip title="撤销 (Ctrl+Z)">
          <Button
            type="text"
            icon={<UndoOutlined />}
            disabled={!canUndo}
            onClick={() => historyManager?.undo()}
            className="toolbar-btn"
            block
          />
        </Tooltip>
        <Tooltip title="重做 (Ctrl+Y)">
          <Button
            type="text"
            icon={<RedoOutlined />}
            disabled={!canRedo}
            onClick={() => historyManager?.redo()}
            className="toolbar-btn"
            block
          />
        </Tooltip>
        <Tooltip title="对比原图 (长按)">
          <Button
            type="text"
            icon={<EyeOutlined />}
            className="toolbar-btn"
            block
            onMouseDown={showOriginal}
            onMouseUp={restoreEdited}
            onMouseLeave={restoreEdited}
            onTouchStart={showOriginal}
            onTouchEnd={restoreEdited}
          />
        </Tooltip>
        <Tooltip title="下载图片">
          <Button
            type="text"
            icon={<DownloadOutlined />}
            onClick={handleDownload}
            className="toolbar-btn"
            block
          />
        </Tooltip>
      </div>
    </div>
  );
}
