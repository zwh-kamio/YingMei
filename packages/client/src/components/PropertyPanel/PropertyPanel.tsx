import React from 'react';
import { Button, Empty } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import { useEditorStore } from '../../stores/editorStore';
import type { EditorTool } from '../../types';
import CropPanel from './panels/CropPanel';
import AdjustPanel from './panels/AdjustPanel';
import FilterPanel from './panels/FilterPanel';
import TextPanel from './panels/TextPanel';
import StickerPanel from './panels/StickerPanel';
import BeautifyPanel from './panels/BeautifyPanel';
import BorderPanel from './panels/BorderPanel';
import CutoutPanel from './panels/CutoutPanel';
import EnhancePanel from './panels/EnhancePanel';
import RemovePanel from './panels/RemovePanel';
import './PropertyPanel.css';

/**
 * 属性面板工厂：根据当前工具模式动态渲染对应面板
 */
const panelFactory: Record<EditorTool, React.FC | null> = {
  select: null,
  crop: CropPanel,
  adjust: AdjustPanel,
  filter: FilterPanel,
  beautify: BeautifyPanel,
  text: TextPanel,
  sticker: StickerPanel,
  border: BorderPanel,
  doodle: null,
  mosaic: null,
  collage: null,
  'ai-cutout': CutoutPanel,
  'ai-remove': RemovePanel,
  'ai-enhance': EnhancePanel,
};

const panelTitles: Partial<Record<EditorTool, string>> = {
  crop: '裁剪',
  adjust: '调色',
  filter: '滤镜',
  beautify: '人像美容',
  text: '文字',
  sticker: '贴纸',
  border: '边框',
  doodle: '涂鸦',
  mosaic: '马赛克',
  collage: '拼图',
  'ai-cutout': 'AI抠图',
  'ai-remove': 'AI消除',
  'ai-enhance': '画质增强',
};

export default function PropertyPanel() {
  const activeTool = useEditorStore((s) => s.activeTool);
  const setActiveTool = useEditorStore((s) => s.setActiveTool);

  const PanelComponent = panelFactory[activeTool];
  const title = panelTitles[activeTool] || '属性';

  return (
    <div className="property-panel">
      <div className="property-panel-header">
        <span className="property-panel-title">{title}</span>
        <Button
          type="text"
          icon={<CloseOutlined />}
          onClick={() => setActiveTool('select')}
          className="property-panel-close"
        />
      </div>
      <div className="property-panel-content">
        {PanelComponent ? <PanelComponent /> : <Empty description="此功能开发中" />}
      </div>
    </div>
  );
}
