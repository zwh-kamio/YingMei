import React from 'react';
import { Slider, Button, Space } from 'antd';
import { UndoOutlined } from '@ant-design/icons';
import { useEditorStore } from '../../../stores/editorStore';
import type { CropRatio } from '../../../types';
import { CROP_RATIO_LABELS, CROP_RATIO_MAP } from '../../../types';

const cropRatios: CropRatio[] = ['free', '1:1', '4:3', '3:4', '16:9', '9:16', '3:2', '2:3'];

export default function CropPanel() {
  const cropRatio = useEditorStore((s) => s.cropRatio);
  const cropRotation = useEditorStore((s) => s.cropRotation);
  const flipX = useEditorStore((s) => s.flipX);
  const flipY = useEditorStore((s) => s.flipY);
  const cropHandlers = useEditorStore((s) => s.cropHandlers);
  const setCropRatio = useEditorStore((s) => s.setCropRatio);
  const setCropRotation = useEditorStore((s) => s.setCropRotation);
  const setFlipX = useEditorStore((s) => s.setFlipX);
  const setFlipY = useEditorStore((s) => s.setFlipY);

  return (
    <div>
      {/* 比例选择 */}
      <div className="param-group">
        <div className="param-group-label">裁剪比例</div>
        <div className="crop-ratio-grid">
          {cropRatios.map((ratio) => (
            <div
              key={ratio}
              className={`crop-ratio-item ${cropRatio === ratio ? 'active' : ''}`}
              onClick={() => setCropRatio(ratio)}
            >
              {CROP_RATIO_LABELS[ratio]}
            </div>
          ))}
        </div>
      </div>

      {/* 旋转 */}
      <div className="param-group">
        <div className="param-group-label">旋转</div>
        <div className="param-row">
          <div className="param-row-label">角度</div>
          <div className="param-row-control">
            <Slider
              min={-45}
              max={45}
              value={cropRotation}
              onChange={(v) => setCropRotation(v)}
              style={{ flex: 1 }}
            />
            <span className="param-value">{cropRotation}°</span>
          </div>
        </div>
        <Space style={{ marginTop: 8 }}>
          <Button size="small" onClick={() => setCropRotation(0)}>
            重置
          </Button>
          <Button size="small" onClick={() => setCropRotation(-90)}>
            -90°
          </Button>
          <Button size="small" onClick={() => setCropRotation(90)}>
            +90°
          </Button>
        </Space>
      </div>

      {/* 镜像翻转 */}
      <div className="param-group">
        <div className="param-group-label">镜像翻转</div>
        <Space>
          <Button
            type={flipX ? 'primary' : 'default'}
            size="small"
            onClick={() => setFlipX(!flipX)}
          >
            水平翻转
          </Button>
          <Button
            type={flipY ? 'primary' : 'default'}
            size="small"
            onClick={() => setFlipY(!flipY)}
          >
            垂直翻转
          </Button>
        </Space>
      </div>

      {/* 确认裁剪 */}
      <div className="param-group">
        <Button
          type="primary"
          block
          style={{ marginBottom: 8 }}
          onClick={() => cropHandlers?.confirm()}
        >
          确认裁剪
        </Button>
        <Button
          block
          icon={<UndoOutlined />}
          onClick={() => cropHandlers?.reset()}
        >
          重置
        </Button>
      </div>
    </div>
  );
}
