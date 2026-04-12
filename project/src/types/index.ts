export interface User {
  id: number;
  username: string;
  role: 'admin' | 'operator' | 'viewer';
  created_at: string;
}

export interface Sensor {
  id: number;
  name: string;
  location: string;
  status: 'active' | 'inactive' | 'maintenance';
  created_at: string;
}

export interface Reading {
  id: number;
  sensor_id: number;
  value: number;
  unit: string;
  recorded_at: string;
  created_at: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface CreateUserRequest {
  username: string;
  password: string;
  role: 'admin' | 'operator' | 'viewer';
}

export interface UpdateUserRoleRequest {
  role: 'admin' | 'operator' | 'viewer';
}

export interface CreateSensorRequest {
  name: string;
  location: string;
  status: 'active' | 'inactive' | 'maintenance';
}

export interface UpdateSensorRequest {
  name: string;
  location: string;
  status: 'active' | 'inactive' | 'maintenance';
}

export interface CreateReadingRequest {
  sensor_id: number;
  value: number;
  unit: string;
  recorded_at: string;
}
