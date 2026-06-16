import React, { useState } from 'react';
import { Button, Slider, message, Progress, Spin } from 'antd';
import { DeleteOutlined, UndoOutlined } from '@ant-design/icons';
import { useEditorStore } from '../../../stores/editorStore';
import * as fabric from 'fabric';
import { ReplaceImageCommand } from '../../../editor/history/commands/ReplaceImageCommand';

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export default function RemovePanel() {
  const canvasRef = useEditorStore((s) => s.canvasRef);
  const originalImageUrl = useEditorStore((s) => s.originalImageUrl);
  const historyManager = useEditorStore((s) => s.historyManager);
  const removeMaskExport = useEditorStore((s) => s.removeMaskExport);

  const [brushSize, setBrushSize] = useState(30);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  // 初始化时同步笔刷大小到遮罩层
  React.useEffect(() => {
    removeMaskExport?.setBrushSize(brushSize);
  }, []);

  // 更新遮罩笔刷大小
  const updateBrushSize = (v: number) => {
    setBrushSize(v);
    removeMaskExport?.setBrushSize(v);
  };

  const handleClear = () => {
    removeMaskExport?.clearMask();
    message.info('遮罩已清除');
  };

  const handleRemove = async () => {
    if (!removeMaskExport) return;
    const maskDataUrl = removeMaskExport.getMaskDataUrl();
    if (!maskDataUrl) {
      message.warning('请先在图片上涂抹要消除的区域');
      return;
    }

    setLoading(true);
    setProgress(10);

    try {
      // 裁切遮罩到图片实际区域并缩放至原始尺寸
      const canvas = canvasRef as fabric.Canvas;
      const bgImage = canvas?.getObjects().find(
        (o: any) => o.name === 'background',
      ) as fabric.FabricImage | undefined;

      let finalMaskUrl = maskDataUrl;
      if (bgImage) {
        const imgW = bgImage.width! * bgImage.scaleX!;
        const imgH = bgImage.height! * bgImage.scaleY!;
        const imgLeft = bgImage.left!;
        const imgTop = bgImage.top!;
        const natW = bgImage.width!;
        const natH = bgImage.height!;

        // 从原始遮罩中裁切图片区域，缩放到图片原始尺寸
        const cropCanvas = document.createElement('canvas');
        cropCanvas.width = natW;
        cropCanvas.height = natH;
        const cctx = cropCanvas.getContext('2d')!;
        const maskImg = await loadImage(maskDataUrl);
        cctx.drawImage(
          maskImg,
          imgLeft, imgTop, imgW, imgH,   // 源区域
          0, 0, natW, natH,               // 目标区域
        );
        finalMaskUrl = cropCanvas.toDataURL('image/png');
      }

      const res = await fetch('/api/ai/remove', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          imageUrl: originalImageUrl,
          maskUrl: finalMaskUrl,
        }),
      });
      const data = await res.json();

      if (data.code === 200) {
        pollTask(data.data.taskId);
      } else {
        throw new Error(data.message || '请求失败');
      }
    } catch (err: any) {
      message.error(err.message || '消除失败');
      setLoading(false);
    }
  };

  const pollTask = async (tid: number) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/ai/task/${tid}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        const data = await res.json();
        const task = data.data;

        setProgress(task.progress || 0);

        if (task.status === 'completed') {
          clearInterval(interval);
          setLoading(false);
          message.success('消除完成');

          const canvas = canvasRef as fabric.Canvas;
          if (canvas && task.resultImageUrl) {
            const bgImage = canvas.getObjects().find(
              (o: any) => o.name === 'background',
            ) as fabric.FabricImage | undefined;
            if (bgImage) {
              fabric.FabricImage.fromURL(task.resultImageUrl, { crossOrigin: 'anonymous' }).then((img) => {
                const cw = canvas.width;
                const ch = canvas.height;
                const scale = Math.min((cw * 0.8) / img.width, (ch * 0.8) / img.height, 1);
                img.set({
                  scaleX: scale,
                  scaleY: scale,
                  left: (cw - img.width * scale) / 2,
                  top: (ch - img.height * scale) / 2,
                  selectable: false,
                  evented: false,
                  name: 'background',
                });
                const cmd = new ReplaceImageCommand(canvas, bgImage, img);
                historyManager?.execute(cmd);
              });
            }
          }
          removeMaskExport?.clearMask();
        } else if (task.status === 'failed') {
          clearInterval(interval);
          setLoading(false);
          message.error(task.errorMsg || '消除失败');
        }
      } catch {
        clearInterval(interval);
        setLoading(false);
      }
    }, 2000);
  };

  return (
    <div>
      <Spin spinning={loading} tip={`IOPaint 处理中 ${progress}%...`}>
        <div style={{ color: '#85d996', fontSize: 12, marginBottom: 12, padding: 8, background: 'rgba(133,217,150,0.1)', borderRadius: 6 }}>
          请在画布上涂抹要消除的区域
        </div>

        <div className="param-group">
          <div className="param-group-label">笔刷大小: {brushSize}px</div>
          <div className="param-row">
            <Slider
              min={5}
              max={100}
              value={brushSize}
              onChange={updateBrushSize}
              style={{ flex: 1 }}
            />
          </div>
        </div>

        <div className="param-group">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <Button
              type="primary"
              danger
              block
              icon={<DeleteOutlined />}
              onClick={handleRemove}
              loading={loading}
            >
              确认消除
            </Button>
            <Button block icon={<UndoOutlined />} onClick={handleClear}>
              清除遮罩
            </Button>
          </div>
        </div>

        {progress > 0 && progress < 100 && (
          <div className="param-group">
            <Progress percent={progress} size="small" />
          </div>
        )}

        <div style={{ fontSize: 12, color: '#999', marginTop: 12, textAlign: 'center' }}>
          基于 IOPaint (LaMa) 模型进行智能消除
        </div>
      </Spin>
    </div>
  );
}
