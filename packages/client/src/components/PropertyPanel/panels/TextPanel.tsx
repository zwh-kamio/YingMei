import React, { useEffect, useState } from 'react';
import { Slider, InputNumber, ColorPicker, Select, Button, Space, Divider } from 'antd';
import { BoldOutlined, ItalicOutlined, UnderlineOutlined, AlignLeftOutlined, AlignCenterOutlined, AlignRightOutlined } from '@ant-design/icons';
import { useEditorStore } from '../../../stores/editorStore';
import * as fabric from 'fabric';

interface TextStyle {
  fontSize: number;
  fontFamily: string;
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  textAlign: string;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  underline: boolean;
  lineHeight: number;
  charSpacing: number;
}

const fontOptions = [
  { label: '默认', value: 'PingFang SC, Microsoft YaHei, sans-serif' },
  { label: '宋体', value: 'SimSun, serif' },
  { label: '黑体', value: 'SimHei, sans-serif' },
  { label: '楷体', value: 'KaiTi, serif' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Courier New', value: '"Courier New", monospace' },
  { label: 'Impact', value: 'Impact, sans-serif' },
];

export default function TextPanel() {
  const canvasRef = useEditorStore((s) => s.canvasRef);
  const [selectedText, setSelectedText] = useState<fabric.IText | null>(null);
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const canvas = canvasRef as fabric.Canvas | null;
    if (!canvas) return;

    const updateSelection = () => {
      const active = canvas.getActiveObject();
      if (active && active instanceof fabric.IText) {
        setSelectedText(active);
      } else {
        setSelectedText(null);
      }
    };

    (canvas as any).on('selection:created', updateSelection);
    (canvas as any).on('selection:updated', updateSelection);
    (canvas as any).on('selection:cleared', () => setSelectedText(null));

    return () => {
      (canvas as any).off('selection:created', updateSelection);
      (canvas as any).off('selection:updated', updateSelection);
      (canvas as any).off('selection:cleared', () => setSelectedText(null));
    };
  }, [canvasRef]);

  const updateProp = (key: string, value: any) => {
    if (!selectedText) return;
    selectedText.set(key as any, value);
    (canvasRef as fabric.Canvas)?.renderAll();
    forceUpdate((n) => n + 1); // 强制重新渲染以更新 UI
  };

  if (!selectedText) {
    return (
      <div style={{ color: 'rgba(255,255,255,0.45)', textAlign: 'center', padding: 40 }}>
        点击选中文字对象以编辑属性
      </div>
    );
  }

  return (
    <div>
      {/* 字体 */}
      <div className="param-group">
        <div className="param-group-label">字体</div>
        <Select
          value={selectedText.fontFamily}
          onChange={(v) => updateProp('fontFamily', v)}
          options={fontOptions}
          style={{ width: '100%' }}
          size="small"
        />
      </div>

      {/* 字号 */}
      <div className="param-group">
        <div className="param-group-label">字号</div>
        <div className="param-row">
          <Slider
            min={12}
            max={200}
            value={selectedText.fontSize || 40}
            onChange={(v) => updateProp('fontSize', v)}
            style={{ flex: 1 }}
          />
          <InputNumber
            min={12}
            max={200}
            value={selectedText.fontSize || 40}
            onChange={(v) => updateProp('fontSize', v ?? 40)}
            size="small"
            style={{ width: 60, marginLeft: 8 }}
          />
        </div>
      </div>

      {/* 文字颜色 & 描边 */}
      <div className="param-group">
        <div className="param-group-label">颜色与描边</div>
        <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
          <div>
            <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>文字色</div>
            <ColorPicker
              value={selectedText.fill as string}
              onChange={(c) => updateProp('fill', c.toHexString())}
              size="small"
            />
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>描边色</div>
            <ColorPicker
              value={selectedText.stroke as string}
              onChange={(c) => updateProp('stroke', c.toHexString())}
              size="small"
            />
          </div>
        </div>
        <div className="param-row">
          <div className="param-row-label">描边宽</div>
          <Slider
            min={0}
            max={10}
            step={0.5}
            value={selectedText.strokeWidth || 0}
            onChange={(v) => updateProp('strokeWidth', v)}
            style={{ flex: 1 }}
          />
        </div>
      </div>

      {/* 样式按钮 */}
      <div className="param-group">
        <div className="param-group-label">样式</div>
        <Space>
          <Button
            size="small"
            type={selectedText.fontWeight === 'bold' ? 'primary' : 'default'}
            icon={<BoldOutlined />}
            onClick={() => updateProp('fontWeight', selectedText.fontWeight === 'bold' ? 'normal' : 'bold')}
          />
          <Button
            size="small"
            type={selectedText.fontStyle === 'italic' ? 'primary' : 'default'}
            icon={<ItalicOutlined />}
            onClick={() => updateProp('fontStyle', selectedText.fontStyle === 'italic' ? 'normal' : 'italic')}
          />
          <Button
            size="small"
            type={selectedText.underline ? 'primary' : 'default'}
            icon={<UnderlineOutlined />}
            onClick={() => updateProp('underline', !selectedText.underline)}
          />
        </Space>
      </div>

      {/* 对齐 */}
      <div className="param-group">
        <div className="param-group-label">对齐</div>
        <Space>
          <Button size="small" icon={<AlignLeftOutlined />} type={selectedText.textAlign === 'left' ? 'primary' : 'default'} onClick={() => updateProp('textAlign', 'left')} />
          <Button size="small" icon={<AlignCenterOutlined />} type={selectedText.textAlign === 'center' ? 'primary' : 'default'} onClick={() => updateProp('textAlign', 'center')} />
          <Button size="small" icon={<AlignRightOutlined />} type={selectedText.textAlign === 'right' ? 'primary' : 'default'} onClick={() => updateProp('textAlign', 'right')} />
        </Space>
      </div>

      {/* 间距 */}
      <div className="param-group">
        <div className="param-group-label">间距</div>
        <div className="param-row">
          <div className="param-row-label">行高</div>
          <Slider min={0.5} max={3} step={0.1} value={selectedText.lineHeight || 1.2} onChange={(v) => updateProp('lineHeight', v)} style={{ flex: 1 }} />
        </div>
        <div className="param-row">
          <div className="param-row-label">字距</div>
          <Slider min={-100} max={500} value={selectedText.charSpacing || 0} onChange={(v) => updateProp('charSpacing', v)} style={{ flex: 1 }} />
        </div>
      </div>

      {/* 透明度 */}
      <div className="param-group">
        <div className="param-group-label">透明度</div>
        <Slider min={0} max={100} value={(selectedText.opacity || 1) * 100} onChange={(v) => updateProp('opacity', v / 100)} />
      </div>
    </div>
  );
}
