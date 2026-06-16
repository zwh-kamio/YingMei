import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, message, Upload, Spin } from 'antd';
import {
  PictureOutlined,
  SmileOutlined,
  AppstoreOutlined,
  ThunderboltOutlined,
  UploadOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import MainLayout from '../../components/Layout/MainLayout';
import { compressImage, getClipboardImage } from '../../utils/imageCompress';
import { uploadApi } from '../../services/api';
import type { UploadToken } from '../../types';
import './HomePage.css';

const tools = [
  { key: 'beautify', icon: <PictureOutlined />, label: '美化图片', desc: '裁剪调色滤镜一键美化' },
  { key: 'face', icon: <SmileOutlined />, label: '人像美容', desc: 'AI美颜磨皮大眼瘦脸' },
  { key: 'collage', icon: <AppstoreOutlined />, label: '拼图', desc: '自由拼图模板拼图海报' },
  { key: 'batch', icon: <ThunderboltOutlined />, label: '批量处理', desc: '批量调整尺寸加水印' },
];

export default function HomePage() {
  const navigate = useNavigate();
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const dragCounter = useRef(0);

  // 处理图片上传
  const processAndUpload = useCallback(
    async (file: File) => {
      setIsUploading(true);
      try {
        // 1. 客户端预压缩
        const compressed = await compressImage(file, { maxWidth: 2048, maxHeight: 2048 });

        // 2. 获取上传凭证
        const tokenRes = await uploadApi.getUploadToken('image');
        const uploadData: UploadToken = tokenRes.data;

        // 3. 构造 FormData 直传 OSS
        const formData = new FormData();
        formData.append('key', uploadData.key);
        formData.append('policy', '');
        formData.append('OSSAccessKeyId', uploadData.credentials.accessKeyId);
        formData.append('success_action_status', '200');
        formData.append('file', compressed, file.name);

        // 4. 实际上传（简化：代理到后端，生产环境应直传 OSS）
        // 由于开发代理配置，这里通过后端中转
        const uploadResult = await fetch('/api/upload/temp', { method: 'POST' });
        // 简化方案：使用 DataURL 在本地处理，无需真实上传
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string;
          sessionStorage.setItem('currentImage', dataUrl);
          sessionStorage.setItem('currentImageName', file.name);
          navigate('/editor');
        };
        reader.readAsDataURL(compressed);
      } catch (err: any) {
        message.error(err.message || '上传失败，请重试');
      } finally {
        setIsUploading(false);
      }
    },
    [navigate],
  );

  // 文件选择
  const handleFileSelect = useCallback(
    (file: File) => {
      if (!file.type.startsWith('image/')) {
        message.warning('请选择图片文件');
        return;
      }
      processAndUpload(file);
    },
    [processAndUpload],
  );

  // 拖拽事件
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items?.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      dragCounter.current = 0;

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFileSelect(files[0]);
      }
    },
    [handleFileSelect],
  );

  // 粘贴上传
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const blob = await getClipboardImage();
      if (blob) {
        const file = new File([blob], 'clipboard.png', { type: blob.type });
        handleFileSelect(file);
      }
    };
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [handleFileSelect]);

  return (
    <MainLayout>
      <div
        className={`home-container ${isDragging ? 'dragging' : ''}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* 拖拽遮罩 */}
        {isDragging && (
          <div className="drag-overlay">
            <div className="drag-overlay-content">
              <UploadOutlined style={{ fontSize: 64, color: '#FF6B81' }} />
              <p>释放图片开始编辑</p>
            </div>
          </div>
        )}

        {/* 主视觉区 */}
        <section className="hero-section">
          <h1 className="hero-title">让每张照片都更美</h1>
          <p className="hero-desc">AI驱动的在线图片编辑美化平台，无需安装，打开浏览器即可使用</p>

          {/* 上传按钮 */}
          <div className="upload-area">
            <Spin spinning={isUploading} tip="处理中...">
              <Upload
                beforeUpload={(file) => {
                  handleFileSelect(file);
                  return false;
                }}
                showUploadList={false}
                accept="image/*"
              >
                <Button type="primary" size="large" icon={<PlusOutlined />} className="upload-btn">
                  上传图片开始编辑
                </Button>
              </Upload>
            </Spin>
            <p className="upload-hint">支持 JPG / PNG / WebP，也可直接拖拽图片或 Ctrl+V 粘贴</p>
          </div>
        </section>

        {/* 工具入口 */}
        <section className="tools-section">
          <div className="tools-grid">
            {tools.map((tool) => (
              <div
                key={tool.key}
                className="tool-card"
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*';
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) handleFileSelect(file);
                  };
                  input.click();
                }}
              >
                <div className="tool-card-icon">{tool.icon}</div>
                <div className="tool-card-label">{tool.label}</div>
                <div className="tool-card-desc">{tool.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* 底部快捷入口 */}
        <section className="quick-section">
          <h3 style={{ textAlign: 'center', color: '#999', fontSize: 14, marginBottom: 16 }}>
            支持浏览器端实时处理，保护隐私
          </h3>
        </section>
      </div>
    </MainLayout>
  );
}
