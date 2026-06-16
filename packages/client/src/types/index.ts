// ====== 编辑器工具类型 ======
export type EditorTool =
  | 'select'
  | 'crop'
  | 'adjust'
  | 'filter'
  | 'beautify'
  | 'text'
  | 'sticker'
  | 'border'
  | 'doodle'
  | 'mosaic'
  | 'collage'
  | 'ai-cutout'
  | 'ai-remove'
  | 'ai-enhance';

// ====== 裁剪比例 ======
export type CropRatio = 'free' | '1:1' | '4:3' | '3:4' | '16:9' | '9:16' | '3:2' | '2:3';

export const CROP_RATIO_MAP: Record<CropRatio, number | null> = {
  free: null,
  '1:1': 1,
  '4:3': 4 / 3,
  '3:4': 3 / 4,
  '16:9': 16 / 9,
  '9:16': 9 / 16,
  '3:2': 3 / 2,
  '2:3': 2 / 3,
};

export const CROP_RATIO_LABELS: Record<CropRatio, string> = {
  free: '自由',
  '1:1': '1:1',
  '4:3': '4:3',
  '3:4': '3:4',
  '16:9': '16:9',
  '9:16': '9:16',
  '3:2': '3:2',
  '2:3': '2:3',
};

// ====== 参数调节 ======
export interface AdjustParams {
  brightness: number;    // -100 ~ 100
  contrast: number;      // -100 ~ 100
  saturation: number;    // -100 ~ 100
  temperature: number;   // -100 ~ 100 (色温)
  highlights: number;    // -100 ~ 100
  shadows: number;       // -100 ~ 100
  sharpen: number;       // 0 ~ 100
  denoise: number;       // 0 ~ 100
}

export const DEFAULT_ADJUST_PARAMS: AdjustParams = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  temperature: 0,
  highlights: 0,
  shadows: 0,
  sharpen: 0,
  denoise: 0,
};

// ====== 用户 ======
export interface UserInfo {
  id: number;
  nickname: string;
  phone: string;
  avatarUrl: string;
  vipLevel: number;
  vipExpireTime: string | null;
}

// ====== API 响应 ======
export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

export interface PaginatedData<T> {
  list: T[];
  total: number;
  page: number;
  size: number;
  totalPages: number;
}

// ====== 上传凭证 ======
export interface UploadToken {
  credentials: {
    accessKeyId: string;
    accessKeySecret: string;
    stsToken: string;
    expiration: string;
  };
  region: string;
  bucket: string;
  endpoint: string;
  key: string;
}

// ====== 历史操作 ======
export interface HistoryCommand {
  id: string;
  type: string;
  params: Record<string, unknown>;
  timestamp: number;
}
