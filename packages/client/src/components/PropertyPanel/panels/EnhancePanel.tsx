import React, { useState } from 'react';
import { Button, Spin, Progress, message, Switch } from 'antd';
import { useEditorStore } from '../../../stores/editorStore';
import * as fabric from 'fabric';
import { ReplaceImageCommand } from '../../../editor/history/commands/ReplaceImageCommand';
import BeforeAfterSlider from '../../common/BeforeAfterSlider';

export default function EnhancePanel() {
  const canvasRef = useEditorStore((s) => s.canvasRef);
  const originalImageUrl = useEditorStore((s) => s.originalImageUrl);
  const historyManager = useEditorStore((s) => s.historyManager);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [enhancedUrl, setEnhancedUrl] = useState<string | null>(null);
  const [showCompare, setShowCompare] = useState(false);

  const handleEnhance = async () => {
    setLoading(true);
    setProgress(10);

    try {
      const res = await fetch('/api/ai/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ imageUrl: originalImageUrl }),
      });
      const data = await res.json();

      if (data.code === 200) {
        pollTask(data.data.taskId);
      } else {
        throw new Error(data.message || '请求失败');
      }
    } catch (err: any) {
      message.error(err.message || '增强失败');
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
          setEnhancedUrl(task.resultImageUrl);
          message.success('画质增强完成');

          // 替换画布背景图（重新计算居中，通过命令模式支持撤销）
          const canvas = canvasRef as fabric.Canvas;
          if (canvas && task.resultImageUrl) {
            const bgImage = canvas.getObjects().find((o: any) => o.name === 'background') as fabric.FabricImage | undefined;
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
        } else if (task.status === 'failed') {
          clearInterval(interval);
          setLoading(false);
          message.error(task.errorMsg || '增强失败');
        }
      } catch {
        clearInterval(interval);
        setLoading(false);
      }
    }, 2000);
  };

  return (
    <div>
      <Spin spinning={loading} tip={`AI 处理中 ${progress}%...`}>
        <div className="param-group">
          <Button type="primary" block onClick={handleEnhance} loading={loading} size="large">
            AI 画质增强
          </Button>
          <div style={{ fontSize: 12, color: '#999', marginTop: 8, textAlign: 'center' }}>
            使用超分辨率 AI 2x 提升画质
          </div>
        </div>

        {progress > 0 && progress < 100 && (
          <div className="param-group">
            <Progress percent={progress} size="small" />
          </div>
        )}

        {enhancedUrl && (
          <div className="param-group">
            <div className="param-group-label">对比预览</div>
            <Switch
              checked={showCompare}
              onChange={setShowCompare}
              checkedChildren="对比"
              unCheckedChildren="关闭"
            />
            {showCompare && (
              <div style={{ marginTop: 8, borderRadius: 8, overflow: 'hidden' }}>
                <BeforeAfterSlider beforeImage={originalImageUrl} afterImage={enhancedUrl} height={200} />
              </div>
            )}
          </div>
        )}
      </Spin>
    </div>
  );
}
