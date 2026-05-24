import { AdminConstants } from '../core/constants';

class AdminApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'AdminApiError';
    this.status = status;
  }
}

class AdminApiClient {
  private key: string | null = null;

  constructor() {
    this.key = sessionStorage.getItem(AdminConstants.adminKeyStorageKey);
  }

  setKey(key: string): void {
    this.key = key;
    sessionStorage.setItem(AdminConstants.adminKeyStorageKey, key);
  }

  clearKey(): void {
    this.key = null;
    sessionStorage.removeItem(AdminConstants.adminKeyStorageKey);
  }

  hasKey(): boolean {
    return !!this.key;
  }

  private headers(extra: Record<string, string> = {}): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json', ...extra };
    if (this.key) h['X-Admin-Key'] = this.key;
    return h;
  }

  private async handle<T>(res: Response): Promise<T> {
    const text = await res.text();
    if (res.ok) {
      if (!text) return null as T;
      try {
        return JSON.parse(text) as T;
      } catch {
        throw new AdminApiError('Server returned non-JSON response', res.status);
      }
    }
    let message = res.statusText;
    try {
      const data = JSON.parse(text);
      message = (data as { detail?: string })?.detail ?? JSON.stringify(data);
    } catch { /* keep statusText */ }
    throw new AdminApiError(message, res.status);
  }

  async get<T>(path: string, params: Record<string, string | number> = {}): Promise<T> {
    const url = new URL(path, window.location.origin);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: this.headers(),
    });
    return this.handle<T>(res);
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(new URL(path, window.location.origin).toString(), {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    return this.handle<T>(res);
  }
}

export { AdminApiError };
export const adminApiClient = new AdminApiClient();
