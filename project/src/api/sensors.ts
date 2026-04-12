import { api } from './client';
import type { Sensor, CreateSensorRequest, UpdateSensorRequest } from '../types';

export const sensorsApi = {
  list: () => api.get<Sensor[]>('/api/sensors'),
  create: (data: CreateSensorRequest) => api.post<Sensor>('/api/sensors', data),
  update: (id: number, data: UpdateSensorRequest) =>
    api.put<{ status: string }>(`/api/sensors/${id}`, data),
  delete: (id: number) => api.delete<{ status: string }>(`/api/sensors/${id}`),
};
