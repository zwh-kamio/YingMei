import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { message } from 'antd';
import EditorContainer from '../../editor/EditorContainer';
import { useEditorStore } from '../../stores/editorStore';

export default function EditorPage() {
  const navigate = useNavigate();
  const setOriginalImageUrl = useEditorStore((s) => s.setOriginalImageUrl);
  const reset = useEditorStore((s) => s.reset);

  useEffect(() => {
    const imageDataUrl = sessionStorage.getItem('currentImage');
    if (!imageDataUrl) {
      message.warning('请先选择图片');
      navigate('/');
      return;
    }
    setOriginalImageUrl(imageDataUrl);
    return () => {
      reset();
    };
  }, []);

  return <EditorContainer />;
}
