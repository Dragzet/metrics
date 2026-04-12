import { api } from './client';
import type { User, CreateUserRequest, UpdateUserRoleRequest } from '../types';

export const usersApi = {
  list: () => api.get<User[]>('/api/users'),
  create: (data: CreateUserRequest) => api.post<User>('/api/users', data),
  updateRole: (id: number, data: UpdateUserRoleRequest) =>
    api.put<{ status: string }>(`/api/users/${id}`, data),
  delete: (id: number) => api.delete<{ status: string }>(`/api/users/${id}`),
};
