import { api } from './client';
import type { LoginRequest, LoginResponse, User } from '../types';

export const authApi = {
  login: (data: LoginRequest) => api.post<LoginResponse>('/api/login', data),
  me: () => api.get<User>('/api/me'),
};
