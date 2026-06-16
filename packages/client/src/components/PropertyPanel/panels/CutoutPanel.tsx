import React, { useState } from 'react';
import { Button, Spin, message, ColorPicker, Progress } from 'antd';
import { useEditorStore } from '../../../stores/editorStore';
import * as fabric from 'fabric';
import { ReplaceImageCommand } from '../../../editor/history/commands/ReplaceImageCommand';

export default function CutoutPanel() {
  const canvasRef = useEditorStore((s) => s.canvasRef);
  const originalImageUrl = useEditorStore((s) => s.originalImageUrl);
  const historyManager = useEditorStore((s) => s.historyManager);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [taskId, setTaskId] = useState<number | null>(null);
  const [bgColor, setBgColor] = useState('#ffffff');

  const handleCutout = async () => {
    const canvas = canvasRef as fabric.Canvas;
    if (!canvas) return;

    const bgImage = canvas.getObjects().find((o: any) => o.name === 'background') as fabric.FabricImage | undefined;
    if (!bgImage) {
      message.warning('请先上传图片');
      return;
    }

    setLoading(true);
    setProgress(10);

    try {
      // 调用后端 AI 抠图 API
      const res = await fetch('/api/ai/cutout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ imageUrl: originalImageUrl }),
      });
      const data = await res.json();

      if (data.code === 200) {
        setTaskId(data.data.taskId);
        // 轮询任务状态
        pollTask(data.data.taskId);
      } else {
        throw new Error(data.message || '请求失败');
      }
    } catch (err: any) {
      message.error(err.message || '抠图失败');
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
          applyCutoutResult(task.resultImageUrl);
          message.success('抠图完成');
        } else if (task.status === 'failed') {
          clearInterval(interval);
          setLoading(false);
          message.error(task.errorMsg || '抠图失败');
        }
      } catch {
        clearInterval(interval);
        setLoading(false);
        message.error('查询任务失败');
      }
    }, 2000);
  };

  const applyCutoutResult = (resultUrl: string) => {
    const canvas = canvasRef as fabric.Canvas;
    if (!canvas || !resultUrl) return;

    const bgImage = canvas.getObjects().find((o: any) => o.name === 'background') as fabric.FabricImage | undefined;
    if (!bgImage) return;

    // 旧的 bg-fill（如果有），撤销时需要恢复
    const oldBgFill = canvas.getObjects().find((o: any) => o.name === 'bg-fill');

    // 添加背景色矩形
    const rect = new fabric.Rect({
      left: bgImage.left,
      top: bgImage.top,
      width: bgImage.width! * bgImage.scaleX!,
      height: bgImage.height! * bgImage.scaleY!,
      fill: bgColor,
      selectable: false,
      evented: false,
      name: 'bg-fill',
    });
    canvas.add(rect);
    (canvas as any).sendObjectToBack(rect);

    // 替换背景图为透明结果图，通过命令模式支持撤销
    fabric.FabricImage.fromURL(resultUrl, { crossOrigin: 'anonymous' }).then((img) => {
      img.set({
        left: bgImage.left,
        top: bgImage.top,
        scaleX: bgImage.scaleX,
        scaleY: bgImage.scaleY,
        selectable: false,
        evented: false,
        name: 'background',
      });
      const cmd = new ReplaceImageCommand(
        canvas,
        bgImage,
        img,
        oldBgFill ? [oldBgFill] : [],
        [rect],
      );
      historyManager?.execute(cmd);
    });
  };

  const handleChangeBg = () => {
    const canvas = canvasRef as fabric.Canvas;
    if (!canvas) return;
    const bgFill = canvas.getObjects().find((o: any) => o.name === 'bg-fill') as fabric.Rect | undefined;
    if (bgFill) {
      bgFill.set({ fill: bgColor });
      canvas.renderAll();
    }
  };

  return (
    <div>
      <Spin spinning={loading} tip={`AI 处理中 ${progress}%...`}>
        <div className="param-group">
          <Button type="primary" block onClick={handleCutout} loading={loading} size="large">
            AI 智能抠图
          </Button>
          <div style={{ fontSize: 12, color: '#999', marginTop: 8, textAlign: 'center' }}>
            调用 DashScope AI 进行人像分割
          </div>
        </div>

        {progress > 0 && progress < 100 && (
          <div className="param-group">
            <Progress percent={progress} size="small" />
          </div>
        )}

        <div className="param-group">
          <div className="param-group-label">替换背景色</div>
          <ColorPicker
            value={bgColor}
            onChange={(c) => { setBgColor(c.toHexString()); handleChangeBg(); }}
          />
        </div>
      </Spin>
    </div>
  );
}
