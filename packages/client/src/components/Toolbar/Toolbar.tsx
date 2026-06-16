import React, { useRef, useCallback } from 'react';
import { Button, Tooltip, Space, Divider } from 'antd';
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
      </div>
    </div>
  );
}
