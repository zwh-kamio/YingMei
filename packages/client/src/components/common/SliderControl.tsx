import React from 'react';
import { Slider, InputNumber } from 'antd';

interface SliderControlProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  suffix?: string;
}

/**
 * 通用滑块控件：滑块 + 数值输入 + 标签
 */
const SliderControl: React.FC<SliderControlProps> = ({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  suffix = '',
}) => {
  return (
    <div className="param-row" style={{ marginBottom: 16 }}>
      <div className="param-row-label" style={{ width: 70 }}>
        {label}
      </div>
      <div className="param-row-control" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Slider
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(v) => onChange(v as number)}
          style={{ flex: 1, margin: 0 }}
        />
        <InputNumber
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(v) => onChange(v ?? 0)}
          size="small"
          style={{ width: 70 }}
          suffix={suffix}
        />
      </div>
    </div>
  );
};

export default SliderControl;
