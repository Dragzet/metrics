import { api } from './client';
import type { Reading, CreateReadingRequest } from '../types';

export const readingsApi = {
  list: (params?: { sensor_id?: number; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.sensor_id) qs.set('sensor_id', String(params.sensor_id));
    if (params?.limit) qs.set('limit', String(params.limit));
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return api.get<Reading[]>(`/api/readings${query}`);
  },
  create: (data: CreateReadingRequest) =>
    api.post<Reading>('/api/readings', data),
};
