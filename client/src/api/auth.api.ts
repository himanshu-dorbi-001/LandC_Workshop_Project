import { apiCall } from './api';

export interface LoginResponseData {
  token:               string;
  forcePasswordChange: boolean;
  role:                'ADMIN' | 'MANAGER' | 'RESOURCE';
  employeeId:          number;
  username:            string;
  fullName:            string;
}

export async function login(username: string, password: string): Promise<LoginResponseData> {
  return apiCall<LoginResponseData>('POST', '/api/auth/login', { username, password });
}

export async function changePassword(
  currentPassword: string,
  newPassword:     string,
): Promise<void> {
  await apiCall('POST', '/api/auth/change-password', { currentPassword, newPassword });
}

export async function forceChangePassword(newPassword: string): Promise<void> {
  await apiCall('POST', '/api/auth/force-change-password', { newPassword });
}
