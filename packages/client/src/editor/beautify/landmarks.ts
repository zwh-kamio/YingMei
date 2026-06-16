/**
 * MediaPipe Face Mesh 468 关键点索引常量
 *
 * 关键点分布示意图：
 * https://developers.google.com/mediapipe/solutions/vision/face_landmarker
 */

// ========== 面部轮廓（Face Oval）==========
// 共 36 个点，从右耳绕下巴到左耳，不含额头
export const FACE_OVAL: number[] = [
  10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288,
  397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136,
  172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109,
];

// 瘦脸所需的下半部轮廓（下巴/下颌线），约 18 个点
export const JAWLINE: number[] = [
  132, 93, 234, 127, 162, 21, 54, 103, 67, 109, 10,
  338, 297, 332, 284, 251, 389, 356,
];

// ========== 左眼（Left Eye）==========
export const LEFT_EYE_CONTOUR: number[] = [
  33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246,
];
export const LEFT_IRIS: number[] = [468, 469, 470, 471, 472];

// ========== 右眼（Right Eye）==========
export const RIGHT_EYE_CONTOUR: number[] = [
  362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398,
];
export const RIGHT_IRIS: number[] = [473, 474, 475, 476, 477];

// ========== 嘴唇（Lips）==========
export const LIPS_OUTER: number[] = [
  61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 409, 270, 269, 267, 0,
  37, 39, 40, 185,
];
export const LIPS_INNER: number[] = [
  78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95,
];

// ========== 眉毛（Eyebrows）==========
export const LEFT_EYEBROW: number[] = [70, 63, 105, 66, 107, 55, 65, 52, 53, 46];
export const RIGHT_EYEBROW: number[] = [300, 293, 334, 296, 336, 285, 295, 282, 283, 276];

// ========== 鼻子（Nose）==========
export const NOSE_TIP: number[] = [1];
export const NOSE_BRIDGE: number[] = [6, 168, 197, 195, 5, 4];
