import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Slider, Button, message, Divider, Spin, Progress } from 'antd';
import { ThunderboltOutlined, LoadingOutlined } from '@ant-design/icons';
import * as fabric from 'fabric';
import { useEditorStore } from '../../../stores/editorStore';
import { ReplaceImageCommand } from '../../../editor/history/commands/ReplaceImageCommand';
import { applyBeautifyFilters, clearBeautifyFilters } from '../../../editor/filters/beautify/BeautifyFilters';
import { detectFace } from '../../../editor/beautify/FaceDetector';
import type { BeautyParams, FaceData } from '../../../editor/beautify/types';
import { DEFAULT_BEAUTY_PARAMS } from '../../../editor/beautify/types';

export default function BeautifyPanel() {
  const canvasRef = useEditorStore((s) => s.canvasRef);
  const originalImageUrl = useEditorStore((s) => s.originalImageUrl);
  const historyManager = useEditorStore((s) => s.historyManager);

  const [params, setParams] = useState<BeautyParams>({ ...DEFAULT_BEAUTY_PARAMS });

  // 人脸检测状态
  const [faceStatus, setFaceStatus] = useState<'idle' | 'loading' | 'ready' | 'failed'>('idle');
  const faceDataRef = useRef<FaceData | null>(null);
  const detectStartedRef = useRef(false);

  // AI 美颜状态
  const [aiLoading, setAiLoading] = useState(false);
  const [aiProgress, setAiProgress] = useState(0);

  // ============ 人脸检测初始化 ============

  const initFaceDetection = useCallback(async () => {
    if (detectStartedRef.current || faceStatus === 'loading') return;
    detectStartedRef.current = true;
    setFaceStatus('loading');

    try {
      const canvas = canvasRef as fabric.Canvas;
      if (!canvas) return;

      const bgImage = canvas.getObjects().find(
        (o: any) => o.name === 'background',
      ) as fabric.FabricImage | undefined;
      if (!bgImage) return;

      // 获取底层 HTMLImageElement
      const imgEl = (bgImage as any)._element as HTMLImageElement | undefined
        ?? (bgImage as any).getElement?.() as HTMLImageElement | undefined;
      if (!imgEl || !(imgEl instanceof HTMLImageElement)) {
        // 尝试从 src 加载
        const src = (bgImage as any).getSrc?.() ?? (bgImage as any).src;
        if (typeof src !== 'string' || !src) {
          setFaceStatus('failed');
          return;
        }
        const loadedImg = await new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = src;
        });
        const faceData = await detectFace(loadedImg);
        faceDataRef.current = faceData;
        setFaceStatus(faceData ? 'ready' : 'failed');
        return;
      }

      const faceData = await detectFace(imgEl);
      faceDataRef.current = faceData;
      setFaceStatus(faceData ? 'ready' : 'failed');
    } catch (err) {
      console.warn('Face detection failed:', err);
      setFaceStatus('failed');
    }
  }, [canvasRef, faceStatus]);

  // 面板首次加载时启动人脸检测
  useEffect(() => {
    initFaceDetection();
    return () => {
      // 面板卸载时不重置，保持检测结果缓存
    };
  }, []);

  // ============ 手动美颜（新管道） ============

  const applyBeauty = useCallback(
    (newParams: BeautyParams) => {
      const canvas = canvasRef as fabric.Canvas;
      if (!canvas) return;

      const bgImage = canvas.getObjects().find(
        (o: any) => o.name === 'background',
      ) as fabric.FabricImage | undefined;
      if (!bgImage) return;

      applyBeautifyFilters(bgImage, newParams, faceDataRef.current);
      canvas.renderAll();
    },
    [canvasRef],
  );

  const updateParam = (key: keyof BeautyParams, value: number) => {
    const newParams = { ...params, [key]: value };
    setParams(newParams);
    applyBeauty(newParams);
  };

  const resetAll = () => {
    const canvas = canvasRef as fabric.Canvas;
    if (!canvas) return;
    const bgImage = canvas.getObjects().find(
      (o: any) => o.name === 'background',
    ) as fabric.FabricImage | undefined;
    if (!bgImage) return;

    clearBeautifyFilters(bgImage);
    canvas.renderAll();
    setParams({ ...DEFAULT_BEAUTY_PARAMS });
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

      {/* ======== 人脸检测状态 ======== */}
      {faceStatus === 'loading' && (
        <div style={{ fontSize: 12, color: '#85d996', marginBottom: 12, textAlign: 'center' }}>
          <LoadingOutlined style={{ marginRight: 6 }} />
          正在检测人脸...
        </div>
      )}
      {faceStatus === 'failed' && (
        <div style={{ fontSize: 12, color: '#faad14', marginBottom: 12, textAlign: 'center' }}>
          未检测到正脸，使用全局效果
        </div>
      )}

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
