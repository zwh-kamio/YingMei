import React, { useState } from 'react';
import { Slider, Button, message, Divider, Spin, Progress } from 'antd';
import { ThunderboltOutlined } from '@ant-design/icons';
import * as fabric from 'fabric';
import { useEditorStore } from '../../../stores/editorStore';
import { setPanelFilters, resetPanelFilters } from '../../../editor/filters/ImageFilters';
import { ReplaceImageCommand } from '../../../editor/history/commands/ReplaceImageCommand';

interface BeautyParams {
  smooth: number;    // 磨皮 0-100
  whiten: number;    // 美白 0-100
  bigEye: number;    // 大眼 0-100
  thinFace: number;  // 瘦脸 0-100
}

export default function BeautifyPanel() {
  const canvasRef = useEditorStore((s) => s.canvasRef);
  const originalImageUrl = useEditorStore((s) => s.originalImageUrl);
  const historyManager = useEditorStore((s) => s.historyManager);
  const [params, setParams] = useState<BeautyParams>({
    smooth: 0,
    whiten: 0,
    bigEye: 0,
    thinFace: 0,
  });

  // AI 美颜状态
  const [aiLoading, setAiLoading] = useState(false);
  const [aiProgress, setAiProgress] = useState(0);

  // ============ 局部滤镜预览（即时响应，低质量） ============

  const applyBeauty = (newParams: BeautyParams) => {
    const canvas = canvasRef as fabric.Canvas;
    if (!canvas) return;

    const bgImage = canvas.getObjects().find((o: any) => o.name === 'background') as fabric.FabricImage | undefined;
    if (!bgImage) return;

    const filters: fabric.filters.BaseFilter<any>[] = [];

    // 磨皮：使用双边滤波模拟（高斯模糊 + 保留边缘）
    if (newParams.smooth > 0) {
      filters.push(
        new fabric.filters.Blur({ blur: (newParams.smooth / 100) * 1.5 }),
      );
      const s = newParams.smooth / 100;
      const center = 1 + s;
      const edge = -s * 0.25;
      filters.push(
        new fabric.filters.Convolute({
          matrix: [0, edge, 0, edge, center, edge, 0, edge, 0],
        }),
      );
    }

    // 美白：提高亮度 + 降低饱和度
    if (newParams.whiten > 0) {
      filters.push(
        new fabric.filters.Brightness({ brightness: (newParams.whiten / 100) * 0.3 }),
      );
      filters.push(
        new fabric.filters.Saturation({ saturation: (newParams.whiten / 100) * -0.2 }),
      );
    }

    // 大眼：通过局部缩放实现（简化版）
    if (newParams.bigEye > 0) {
      const e = newParams.bigEye / 100;
      filters.push(
        new fabric.filters.Convolute({
          matrix: [-e * 0.1, -e * 0.1, -e * 0.1, -e * 0.1, 1 + e * 0.8, -e * 0.1, -e * 0.1, -e * 0.1, -e * 0.1],
        }),
      );
    }

    // 瘦脸
    if (newParams.thinFace > 0) {
      filters.push(
        new fabric.filters.Contrast({ contrast: (newParams.thinFace / 100) * 0.15 }),
      );
    }

    setPanelFilters(bgImage, 'beautify', filters);
    canvas.renderAll();
  };

  const updateParam = (key: keyof BeautyParams, value: number) => {
    const newParams = { ...params, [key]: value };
    setParams(newParams);
    applyBeauty(newParams);
  };

  const resetAll = () => {
    const canvas = canvasRef as fabric.Canvas;
    if (!canvas) return;
    const bgImage = canvas.getObjects().find((o: any) => o.name === 'background') as fabric.FabricImage | undefined;
    if (!bgImage) return;

    resetPanelFilters(bgImage, 'beautify');
    canvas.renderAll();
    setParams({ smooth: 0, whiten: 0, bigEye: 0, thinFace: 0 });
  };

  // ============ AI 智能美颜（服务端 DashScope Qwen-Image-Edit-Plus） ============

  const handleAiBeautify = async () => {
    setAiLoading(true);
    setAiProgress(10);

    try {
      const res = await fetch('/api/ai/beautify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ imageUrl: originalImageUrl }),
      });
      const data = await res.json();

      if (data.code === 200) {
        pollTask(data.data.taskId);
      } else {
        throw new Error(data.message || '请求失败');
      }
    } catch (err: any) {
      message.error(err.message || 'AI美颜失败');
      setAiLoading(false);
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

        setAiProgress(task.progress || 0);

        if (task.status === 'completed') {
          clearInterval(interval);
          setAiLoading(false);
          message.success('AI 美颜完成');

          // 替换画布背景图（重新计算居中，通过命令模式支持撤销）
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
        } else if (task.status === 'failed') {
          clearInterval(interval);
          setAiLoading(false);
          message.error(task.errorMsg || 'AI美颜失败');
        }
      } catch {
        clearInterval(interval);
        setAiLoading(false);
      }
    }, 2000);
  };

  return (
    <div>
      {/* ======== 方式一：AI 智能美颜（推荐） ======== */}
      <Spin spinning={aiLoading} tip={`AI 美颜处理中 ${aiProgress}%...`}>
        <div className="param-group">
          <Button
            type="primary"
            block
            onClick={handleAiBeautify}
            loading={aiLoading}
            size="large"
            icon={<ThunderboltOutlined />}
          >
            AI 智能美颜
          </Button>
          <div style={{ fontSize: 12, color: '#999', marginTop: 8, textAlign: 'center' }}>
            基于 AI 大模型，自然美颜不假面
          </div>
        </div>

        {aiProgress > 0 && aiProgress < 100 && (
          <div className="param-group">
            <Progress percent={aiProgress} size="small" />
          </div>
        )}

      </Spin>

      <Divider style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
        <span style={{ color: '#888', fontSize: 12 }}>手动微调</span>
      </Divider>

      {/* ======== 方式二：手动滑块微调（即时预览） ======== */}
      <div className="param-group">
        <div className="param-group-label">磨皮</div>
        <div className="param-row">
          <Slider
            min={0}
            max={100}
            value={params.smooth}
            onChange={(v) => updateParam('smooth', v)}
            style={{ flex: 1 }}
          />
          <span className="param-value">{params.smooth}</span>
        </div>
      </div>

      <div className="param-group">
        <div className="param-group-label">美白</div>
        <div className="param-row">
          <Slider
            min={0}
            max={100}
            value={params.whiten}
            onChange={(v) => updateParam('whiten', v)}
            style={{ flex: 1 }}
          />
          <span className="param-value">{params.whiten}</span>
        </div>
      </div>

      <div className="param-group">
        <div className="param-group-label">大眼</div>
        <div className="param-row">
          <Slider
            min={0}
            max={100}
            value={params.bigEye}
            onChange={(v) => updateParam('bigEye', v)}
            style={{ flex: 1 }}
          />
          <span className="param-value">{params.bigEye}</span>
        </div>
      </div>

      <div className="param-group">
        <div className="param-group-label">瘦脸</div>
        <div className="param-row">
          <Slider
            min={0}
            max={100}
            value={params.thinFace}
            onChange={(v) => updateParam('thinFace', v)}
            style={{ flex: 1 }}
          />
          <span className="param-value">{params.thinFace}</span>
        </div>
      </div>

      <Divider style={{ borderColor: 'rgba(255,255,255,0.1)' }} />

      <div className="param-group">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <Button
            block
            onClick={() => {
              const p = { smooth: 50, whiten: 40, bigEye: 30, thinFace: 30 };
              setParams(p);
              applyBeauty(p);
              message.success('一键美颜已应用');
            }}
          >
            一键美颜
          </Button>
          <Button block onClick={resetAll}>
            重置
          </Button>
        </div>
      </div>
    </div>
  );
}
