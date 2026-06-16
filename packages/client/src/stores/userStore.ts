import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { UserInfo } from '../types';

interface UserState {
  user: UserInfo | null;
  token: string | null;
  isLoggedIn: boolean;

  setUser: (user: UserInfo) => void;
  setToken: (token: string) => void;
  login: (user: UserInfo, token: string) => void;
  logout: () => void;
}

export const useUserStore = create<UserState>()(
  immer((set) => ({
    user: JSON.parse(localStorage.getItem('user') || 'null'),
    token: localStorage.getItem('token'),
    isLoggedIn: !!localStorage.getItem('token'),

    setUser: (user) =>
      set((state) => {
        state.user = user;
        localStorage.setItem('user', JSON.stringify(user));
      }),

    setToken: (token) =>
      set((state) => {
        state.token = token;
        state.isLoggedIn = true;
        localStorage.setItem('token', token);
      }),

    login: (user, token) =>
      set((state) => {
        state.user = user;
        state.token = token;
        state.isLoggedIn = true;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
      }),

    logout: () =>
      set((state) => {
        state.user = null;
        state.token = null;
        state.isLoggedIn = false;
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }),
  })),
);
