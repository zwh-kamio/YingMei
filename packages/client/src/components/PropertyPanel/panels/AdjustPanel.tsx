import React, { useState } from 'react';
import { Slider, Button, Divider, message } from 'antd';
import { UndoOutlined, ExperimentOutlined } from '@ant-design/icons';
import { useEditorStore } from '../../../stores/editorStore';
import type { AdjustParams } from '../../../types';
import { DEFAULT_ADJUST_PARAMS } from '../../../types';

interface AdjustItem {
  key: keyof AdjustParams;
  label: string;
  min: number;
  max: number;
  step: number;
}

const basicItems: AdjustItem[] = [
  { key: 'brightness', label: '亮度', min: -100, max: 100, step: 1 },
  { key: 'contrast', label: '对比度', min: -100, max: 100, step: 1 },
  { key: 'saturation', label: '饱和度', min: -100, max: 100, step: 1 },
  { key: 'temperature', label: '色温', min: -100, max: 100, step: 1 },
];

const advancedItems: AdjustItem[] = [
  { key: 'highlights', label: '高光', min: -100, max: 100, step: 1 },
  { key: 'shadows', label: '阴影', min: -100, max: 100, step: 1 },
  { key: 'sharpen', label: '锐化', min: 0, max: 100, step: 1 },
  { key: 'denoise', label: '降噪', min: 0, max: 100, step: 1 },
];

/** 一键美化预设参数 */
const BEAUTIFY_PRESET: AdjustParams = {
  brightness: 12,
  contrast: 18,
  saturation: 22,
  temperature: 8,
  highlights: -10,
  shadows: 15,
  sharpen: 20,
  denoise: 0,
};

export default function AdjustPanel() {
  const adjustParams = useEditorStore((s) => s.adjustParams);
  const setAdjustParam = useEditorStore((s) => s.setAdjustParam);
  const resetAdjustParams = useEditorStore((s) => s.resetAdjustParams);

  const [beautifyActive, setBeautifyActive] = useState(false);

  // ============ 一键美化 — 预设滤镜参数 ============
  const handleOneClickBeautify = () => {
    const isActive = !beautifyActive;
    setBeautifyActive(isActive);

    if (isActive) {
      (Object.keys(BEAUTIFY_PRESET) as (keyof AdjustParams)[]).forEach((key) => {
        setAdjustParam(key, BEAUTIFY_PRESET[key]);
      });
      message.success('一键美化已应用');
    } else {
      resetAdjustParams();
      message.info('已恢复原始参数');
    }
  };

  const renderSlider = (item: AdjustItem) => (
    <div className="param-row" key={item.key}>
      <div className="param-row-label">{item.label}</div>
      <div className="param-row-control">
        <Slider
          min={item.min}
          max={item.max}
          step={item.step}
          value={adjustParams[item.key]}
          onChange={(v) => setAdjustParam(item.key, v)}
          style={{ flex: 1 }}
          tooltip={{ formatter: (v) => `${v}` }}
        />
        <span className="param-value">{adjustParams[item.key]}</span>
      </div>
    </div>
  );

  return (
    <div>
      {/* 预设按钮 */}
      <div className="param-group">
        <Button
          size="small"
          block
          type={beautifyActive ? 'primary' : 'default'}
          icon={<ExperimentOutlined />}
          onClick={handleOneClickBeautify}
        >
          {beautifyActive ? '已美化' : '一键美化'}
        </Button>
      </div>

      <Divider style={{ margin: '12px 0', borderColor: 'rgba(255,255,255,0.1)' }} />

      {/* 基础调节 */}
      <div className="param-group">
        <div className="param-group-label">基础调节</div>
        {basicItems.map(renderSlider)}
      </div>

      <Divider style={{ margin: '12px 0', borderColor: 'rgba(255,255,255,0.1)' }} />

      {/* 高级调节 */}
      <div className="param-group">
        <div className="param-group-label">高级调节</div>
        {advancedItems.map(renderSlider)}
      </div>

      {/* 重置 */}
      <Button
        block
        icon={<UndoOutlined />}
        onClick={() => {
          resetAdjustParams();
          setBeautifyActive(false);
        }}
        style={{ marginTop: 8 }}
      >
        重置全部
      </Button>
    </div>
  );
}
