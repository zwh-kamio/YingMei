import React, { useCallback, useEffect, useRef } from 'react';
import { message } from 'antd';
import Toolbar from '../components/Toolbar/Toolbar';
import PropertyPanel from '../components/PropertyPanel/PropertyPanel';
import FabricCanvas from './Canvas/FabricCanvas';
import CropOverlay from './overlay/CropOverlay';
import { useEditorStore } from '../stores/editorStore';
import './EditorContainer.css';

export default function EditorContainer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeTool = useEditorStore((s) => s.activeTool);
  const originalImageUrl = useEditorStore((s) => s.originalImageUrl);
  const setActiveTool = useEditorStore((s) => s.setActiveTool);
  const canUndo = useEditorStore((s) => s.canUndo);
  const canRedo = useEditorStore((s) => s.canRedo);
  const historyManager = useEditorStore((s) => s.historyManager);

  // 键盘快捷键
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Ctrl+Z 撤销
      if (e.ctrlKey && !e.shiftKey && e.key === 'z') {
        e.preventDefault();
        historyManager?.undo();
      }
      // Ctrl+Y 或 Ctrl+Shift+Z 重做
      if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z')) {
        e.preventDefault();
        historyManager?.redo();
      }
      // Delete 删除选中对象
      if (e.key === 'Delete' || e.key === 'Backspace') {
        // 不在输入框中时删除画布对象
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag !== 'INPUT' && tag !== 'TEXTAREA') {
          // 画布删除逻辑在 FabricCanvas 中处理
        }
      }
      // Escape 退出当前工具
      if (e.key === 'Escape') {
        setActiveTool('select');
      }
    },
    [historyManager, setActiveTool],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="editor-container" ref={containerRef}>
      {/* 左侧工具栏 */}
      <Toolbar />

      {/* 中央画布区 */}
      <div className="editor-canvas-area">
        <FabricCanvas />
        {activeTool === 'crop' && <CropOverlay />}
      </div>

      {/* 右侧属性面板 */}
      {activeTool !== 'select' && <PropertyPanel />}
    </div>
  );
}
