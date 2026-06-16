import React, { useState, useRef, useEffect } from 'react';

interface BeforeAfterSliderProps {
  beforeImage: string;
  afterImage: string;
  height?: number;
}

/**
 * 对比滑块：拖拽中线比较原图与编辑效果
 */
const BeforeAfterSlider: React.FC<BeforeAfterSliderProps> = ({
  beforeImage,
  afterImage,
  height = 400,
}) => {
  const [position, setPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setPosition(percent);
  };

  const handleMouseDown = () => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', () => {
      document.removeEventListener('mousemove', handleMouseMove);
    }, { once: true });
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height,
        overflow: 'hidden',
        cursor: 'ew-resize',
        userSelect: 'none',
      }}
      onMouseDown={handleMouseDown}
    >
      {/* 原图（底层） */}
      <img
        src={beforeImage}
        alt="原图"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />
      {/* 效果图（裁剪显示） */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: `${position}%`,
          height: '100%',
          overflow: 'hidden',
        }}
      >
        <img
          src={afterImage}
          alt="效果图"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: `${containerRef.current?.clientWidth || 800}px`,
            height: '100%',
            objectFit: 'cover',
          }}
        />
      </div>
      {/* 中线 */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: `${position}%`,
          width: 2,
          height: '100%',
          background: '#fff',
          boxShadow: '0 0 8px rgba(0,0,0,0.3)',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
};

export default BeforeAfterSlider;
