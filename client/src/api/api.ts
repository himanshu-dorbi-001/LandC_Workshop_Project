import { CONFIG } from '../config/config';
import { session } from '../session/session';

interface ServerResponse<T> {
  success: boolean;
  data:    T;
  message: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiCall<T = unknown>(
  method:    'GET' | 'POST' | 'PUT' | 'DELETE',
  path:      string,
  body?:     unknown,
  timeoutMs: number = CONFIG.REQUEST_TIMEOUT_MS,
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  const token = session.getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const controller = new AbortController();
  const timer      = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(`${CONFIG.BASE_URL}${path}`, {
      method,
      headers,
      body:   body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (err: unknown) {
    clearTimeout(timer);
    const msg = (err as Error).name === 'AbortError'
      ? 'Request timed out. Is the server running?'
      : 'Cannot reach server. Is it running on port 3000?';
    throw new ApiError(msg, 0);
  } finally {
    clearTimeout(timer);
  }

  const json = await response.json() as ServerResponse<T>;

  if (!json.success) {
    throw new ApiError(json.message ?? 'Request failed', response.status);
  }

  return json.data;
}
