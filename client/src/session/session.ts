export interface SessionData {
  token:         string;
  employeeId:    number;
  username:      string;
  role:          'ADMIN' | 'MANAGER' | 'RESOURCE';
  fullName:      string;
}

let current: SessionData | null = null;

export const session = {
  set(data: SessionData): void {
    current = data;
  },
  get(): SessionData | null {
    return current;
  },
  getToken(): string | null {
    return current?.token ?? null;
  },
  getRole(): string | null {
    return current?.role ?? null;
  },
  clear(): void {
    current = null;
  },
  isLoggedIn(): boolean {
    return current !== null;
  },
};
