import { FaceLandmarker, FilesetResolver, type NormalizedLandmark } from '@mediapipe/tasks-vision';
import type { FaceData } from './types';
import { generateSkinMask } from './SkinMaskGenerator';

let faceLandmarker: FaceLandmarker | null = null;
let initPromise: Promise<void> | null = null;

/**
 * 初始化 MediaPipe FaceLandmarker（懒加载，全局单例）
 * 首次调用时下载 ~8MB WASM 模型文件
 */
export async function initFaceDetector(): Promise<void> {
  if (faceLandmarker) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm',
    );

    faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task',
      },
      outputFaceBlendshapes: false,
      outputFacialTransformationMatrixes: false,
      runningMode: 'IMAGE',
      numFaces: 1,
    });
  })();

  return initPromise;
}

/**
 * 检测图片中的人脸，返回关键点和肤色遮罩
 *
 * @param imageElement - 图片元素（FabricImage 的底层 HTMLImageElement）
 * @returns FaceData 或 null（未检测到人脸）
 */
export async function detectFace(imageElement: HTMLImageElement): Promise<FaceData | null> {
  await initFaceDetector();
  if (!faceLandmarker) return null;

  const result = faceLandmarker.detect(imageElement);
  if (!result.faceLandmarks || result.faceLandmarks.length === 0) {
    return null;
  }

  const skinMask = generateSkinMask(
    result.faceLandmarks[0],
    imageElement.naturalWidth,
    imageElement.naturalHeight,
  );

  return {
    landmarks: result.faceLandmarks,
    skinMask,
    imageWidth: imageElement.naturalWidth,
    imageHeight: imageElement.naturalHeight,
  };
}

/**
 * 释放资源（页面卸载时调用）
 */
export function disposeFaceDetector(): void {
  faceLandmarker?.close();
  faceLandmarker = null;
  initPromise = null;
}
