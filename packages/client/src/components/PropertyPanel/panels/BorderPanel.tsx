import React, { useState } from 'react';
import { Slider, ColorPicker, Segmented, Button } from 'antd';
import * as fabric from 'fabric';
import { useEditorStore } from '../../../stores/editorStore';

export default function BorderPanel() {
  const canvasRef = useEditorStore((s) => s.canvasRef);
  const [borderWidth, setBorderWidth] = useState(10);
  const [borderColor, setBorderColor] = useState('#ffffff');
  const [borderRadius, setBorderRadius] = useState(0);
  const [shadowBlur, setShadowBlur] = useState(0);
  const [shadowColor, setShadowColor] = useState('#000000');

  const applyBorder = () => {
    const canvas = canvasRef as fabric.Canvas;
    if (!canvas) return;

    const bgImage = canvas.getObjects().find((o: any) => o.name === 'background') as fabric.FabricImage | undefined;
    if (!bgImage) return;

    const canvasW = canvas.getWidth();
    const canvasH = canvas.getHeight();

    // 移除旧边框（name='border' 的对象）
    const oldBorders = canvas.getObjects().filter((o: any) => o.name === 'border');
    oldBorders.forEach((o) => canvas.remove(o));

    if (borderWidth <= 0 && shadowBlur <= 0) {
      canvas.renderAll();
      return;
    }

    // 添加矩形边框
    if (borderWidth > 0) {
      const borderRect = new fabric.Rect({
        left: (bgImage.left || 0) - borderWidth,
        top: (bgImage.top || 0) - borderWidth,
        width: (bgImage.width || 0) * (bgImage.scaleX || 1) + borderWidth * 2,
        height: (bgImage.height || 0) * (bgImage.scaleY || 1) + borderWidth * 2,
        fill: 'transparent',
        stroke: borderColor,
        strokeWidth: borderWidth,
        rx: borderRadius,
        ry: borderRadius,
        selectable: false,
        evented: false,
        name: 'border',
      });

      // 阴影
      if (shadowBlur > 0) {
        borderRect.set({
          shadow: new fabric.Shadow({
            color: shadowColor,
            blur: shadowBlur,
            offsetX: 0,
            offsetY: 2,
          }),
        });
      }

      canvas.add(borderRect);
      (canvas as any).sendObjectToBack(borderRect);
      // border 应该在 background 上面
      (canvas as any).moveTo(borderRect, 1);
    }

    canvas.renderAll();
  };

  return (
    <div>
      <div className="param-group">
        <div className="param-group-label">边框粗细</div>
        <div className="param-row">
          <Slider min={0} max={50} value={borderWidth} onChange={(v) => { setBorderWidth(v); applyBorder(); }} style={{ flex: 1 }} />
          <span className="param-value">{borderWidth}px</span>
        </div>
      </div>

      <div className="param-group">
        <div className="param-group-label">边框颜色</div>
        <ColorPicker value={borderColor} onChange={(c) => { setBorderColor(c.toHexString()); applyBorder(); }} />
      </div>

      <div className="param-group">
        <div className="param-group-label">圆角</div>
        <div className="param-row">
          <Slider min={0} max={50} value={borderRadius} onChange={(v) => { setBorderRadius(v); applyBorder(); }} style={{ flex: 1 }} />
          <span className="param-value">{borderRadius}px</span>
        </div>
      </div>

      <div className="param-group">
        <div className="param-group-label">阴影模糊</div>
        <div className="param-row">
          <Slider min={0} max={30} value={shadowBlur} onChange={(v) => { setShadowBlur(v); applyBorder(); }} style={{ flex: 1 }} />
          <span className="param-value">{shadowBlur}px</span>
        </div>
      </div>

      <div className="param-group">
        <div className="param-group-label">阴影颜色</div>
        <ColorPicker value={shadowColor} onChange={(c) => { setShadowColor(c.toHexString()); applyBorder(); }} />
      </div>

      <Button
        block
        onClick={() => {
          setBorderWidth(0);
          setShadowBlur(0);
          setBorderRadius(0);
          applyBorder();
        }}
      >
        移除边框
      </Button>
    </div>
  );
}
