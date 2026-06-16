import React, { useState, useEffect } from 'react';
import { Input, Empty, Spin, Segmented, Slider } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useEditorStore } from '../../../stores/editorStore';
import { materialApi } from '../../../services/api';
import * as fabric from 'fabric';
import { AddObjectCommand } from '../../../editor/history/commands/AddObjectCommand';

let stickerIdCounter = 0;
function nextStickerId(): string {
  return `sticker_${Date.now()}_${++stickerIdCounter}`;
}

// 内置 emoji 贴纸（无需服务端，立即可用）
const builtinStickers = [
  { id: 's1', label: '❤️', emoji: '❤️' },
  { id: 's2', label: '⭐', emoji: '⭐' },
  { id: 's3', label: '🔥', emoji: '🔥' },
  { id: 's4', label: '✨', emoji: '✨' },
  { id: 's5', label: '🎉', emoji: '🎉' },
  { id: 's6', label: '💎', emoji: '💎' },
  { id: 's7', label: '🌸', emoji: '🌸' },
  { id: 's8', label: '🌈', emoji: '🌈' },
  { id: 's9', label: '💖', emoji: '💖' },
  { id: 's10', label: '👍', emoji: '👍' },
  { id: 's11', label: '😊', emoji: '😊' },
  { id: 's12', label: '🎨', emoji: '🎨' },
];

export default function StickerPanel() {
  const canvasRef = useEditorStore((s) => s.canvasRef);
  const historyManager = useEditorStore((s) => s.historyManager);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(false);
  const [serverStickers, setServerStickers] = useState<any[]>([]);

  useEffect(() => {
    // 尝试从服务端加载贴纸
    setLoading(true);
    materialApi
      .getStickers(undefined, undefined, 1, 50)
      .then((res: any) => {
        if (res.data?.list?.length > 0) {
          setServerStickers(res.data.list);
        }
      })
      .catch(() => {
        // 服务端无数据时使用内置贴纸
      })
      .finally(() => setLoading(false));
  }, []);

  const addEmojiSticker = (emoji: string) => {
    const canvas = canvasRef as fabric.Canvas;
    if (!canvas) return;

    const text = new fabric.IText(emoji, {
      left: canvas.getWidth() / 2 - 30,
      top: canvas.getHeight() / 2 - 30,
      fontSize: 80,
      name: nextStickerId(),
    });
    (text as any).id = (text as any).name;

    const cmd = new AddObjectCommand(canvas, text);
    historyManager?.execute(cmd);
    canvas.renderAll();
  };

  const addServerSticker = async (sticker: any) => {
    const canvas = canvasRef as fabric.Canvas;
    if (!canvas || !sticker.fileUrl) return;

    try {
      const img = await fabric.FabricImage.fromURL(sticker.fileUrl, { crossOrigin: 'anonymous' });
      const scale = Math.min(150 / img.width, 150 / img.height, 1);
      img.set({
        left: canvas.getWidth() / 2 - (img.width * scale) / 2,
        top: canvas.getHeight() / 2 - (img.height * scale) / 2,
        scaleX: scale,
        scaleY: scale,
        name: nextStickerId(),
      });
      (img as any).id = (img as any).name;

      const cmd = new AddObjectCommand(canvas, img);
      historyManager?.execute(cmd);
      canvas.renderAll();
    } catch {
      // 图片加载失败
    }
  };

  return (
    <div>
      <div className="param-group">
        <Input
          placeholder="搜索贴纸"
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          allowClear
          size="small"
        />
      </div>

      <Spin spinning={loading}>
        {/* 内置 emoji 贴纸 */}
        <div className="param-group">
          <div className="param-group-label">Emoji 贴纸</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {builtinStickers
              .filter((s) => !searchText || s.label.includes(searchText))
              .map((s) => (
                <div
                  key={s.id}
                  onClick={() => addEmojiSticker(s.emoji)}
                  style={{
                    fontSize: 32,
                    textAlign: 'center',
                    padding: 10,
                    cursor: 'pointer',
                    borderRadius: 8,
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    userSelect: 'none',
                  }}
                  title={s.label}
                >
                  {s.emoji}
                </div>
              ))}
          </div>
        </div>

        {/* 服务端贴纸 */}
        {serverStickers.length > 0 && (
          <div className="param-group">
            <div className="param-group-label">在线贴纸</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {serverStickers
                .filter((s) => !searchText || s.name.includes(searchText))
                .map((s) => (
                  <div
                    key={s.id}
                    onClick={() => addServerSticker(s)}
                    style={{
                      cursor: 'pointer',
                      borderRadius: 8,
                      overflow: 'hidden',
                      border: '1px solid rgba(255,255,255,0.1)',
                    }}
                  >
                    <img
                      src={s.thumbnailUrl || s.fileUrl}
                      alt={s.name}
                      style={{ width: '100%', aspectRatio: '1', objectFit: 'contain', background: 'rgba(255,255,255,0.03)' }}
                    />
                  </div>
                ))}
            </div>
          </div>
        )}

        {!loading && serverStickers.length === 0 && (
          <Empty description="暂无在线贴纸，使用 Emoji 贴纸" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        )}
      </Spin>
    </div>
  );
}
