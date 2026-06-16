/** 美颜参数 */
export interface BeautyParams {
  smooth: number;    // 磨皮 0-100
  whiten: number;    // 美白 0-100
  bigEye: number;    // 大眼 0-100
  thinFace: number;  // 瘦脸 0-100
}

/** 默认美颜参数 */
export const DEFAULT_BEAUTY_PARAMS: BeautyParams = {
  smooth: 0,
  whiten: 0,
  bigEye: 0,
  thinFace: 0,
};

/** 标准化后的关键点坐标（0~1，对应图片 UV 空间） */
export interface NormalizedLandmark {
  x: number;
  y: number;
  z: number;
}

/** 人脸检测结果 */
export interface FaceData {
  /** 468 个标准化关键点 */
  landmarks: NormalizedLandmark[][];
  /** 肤色遮罩 Canvas（用于磨皮/美白区域限定） */
  skinMask: HTMLCanvasElement;
  /** 图片原始宽高（关键点坐标需乘以此值转为像素） */
  imageWidth: number;
  imageHeight: number;
}
