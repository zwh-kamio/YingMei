import axios from 'axios';
import type { ApiResponse, UploadToken } from '../types';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

// 请求拦截器：注入 token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截器：统一错误处理
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.message || error.message || '网络错误';
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    return Promise.reject(new Error(message));
  },
);

// ====== Auth API ======
export const authApi = {
  register: (phone: string, password: string, nickname?: string) =>
    api.post<any, ApiResponse<{ user: any; token: string }>>('/auth/register', { phone, password, nickname }),

  login: (phone: string, password: string) =>
    api.post<any, ApiResponse<{ user: any; token: string }>>('/auth/login', { phone, password }),
};

// ====== User API ======
export const userApi = {
  getProfile: () => api.get<any, ApiResponse<any>>('/user/info'),
  updateProfile: (data: { nickname?: string; avatarUrl?: string }) =>
    api.put<any, ApiResponse<any>>('/user/profile', data),
};

// ====== Upload API ======
export const uploadApi = {
  getUploadToken: (type: string = 'image') =>
    api.post<any, ApiResponse<UploadToken>>(`/upload/temp?type=${type}`),
};

// ====== Material API ======
export const materialApi = {
  getFilters: (category?: string, page = 1, size = 30) =>
    api.get<any, ApiResponse<any>>('/materials/filters', { params: { category, page, size } }),

  getStickers: (keyword?: string, category?: string, page = 1, size = 50) =>
    api.get<any, ApiResponse<any>>('/materials/stickers', { params: { keyword, category, page, size } }),

  getFonts: (page = 1, size = 50) =>
    api.get<any, ApiResponse<any>>('/materials/fonts', { params: { page, size } }),
};

export default api;
