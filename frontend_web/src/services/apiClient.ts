import { AppConstants } from '../core/constants';
import type { AudioFile } from './audioService';

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

class ApiClient {
  private readonly baseUrl: string;
  private token: string | null = null;

  constructor() {
    this.baseUrl = AppConstants.baseUrl;
    // Read persisted token synchronously so the first request after refresh
    // includes Authorization before AuthProvider's useEffect runs.
    this.token = localStorage.getItem(AppConstants.tokenKey);
  }

  setToken(token: string | null): void {
    this.token = token;
  }

  private authHeader(): Record<string, string> {
    return this.token ? { Authorization: `Bearer ${this.token}` } : {};
  }

  /** Absolute URL for a path; empty baseUrl → same origin (FastAPI-hosted SPA). */
  private resolveUrl(path: string): URL {
    return new URL(path, this.baseUrl || window.location.origin);
  }

  private async handleResponse<T>(res: Response): Promise<T> {
    const text = await res.text();
    if (res.ok) {
      if (!text) return null as T;
      try {
        return JSON.parse(text) as T;
      } catch {
        throw new ApiError(
          'Server returned HTML instead of JSON — is the API running and is baseUrl configured correctly?',
          res.status,
        );
      }
    }
    let message = res.statusText;
    try {
      const data = text ? JSON.parse(text) : null;
      message = (data as { detail?: string })?.detail ?? JSON.stringify(data);
    } catch {
      if (text.trimStart().startsWith('<!DOCTYPE') || text.trimStart().startsWith('<html')) {
        message =
          'Server returned HTML instead of JSON — is the API running and is baseUrl configured correctly?';
      }
    }
    throw new ApiError(message, res.status);
  }

  async get<T = unknown>(path: string, params: Record<string, string> = {}): Promise<T> {
    const url = this.resolveUrl(path);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...this.authHeader(),
      },
    });
    return this.handleResponse<T>(res);
  }

  async post<T = unknown>(path: string, body: unknown): Promise<T> {
    const res = await fetch(this.resolveUrl(path).toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.authHeader(),
      },
      body: JSON.stringify(body),
    });
    return this.handleResponse<T>(res);
  }

  async delete<T = unknown>(path: string): Promise<T> {
    const res = await fetch(this.resolveUrl(path).toString(), {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...this.authHeader(),
      },
    });
    return this.handleResponse<T>(res);
  }

  /**
   * Multipart POST for a single file (e.g. JSON topic upload).
   */
  async postFile<T = unknown>(path: string, file: File, fieldName = 'file'): Promise<T> {
    const formData = new FormData();
    formData.append(fieldName, file);
    const res = await fetch(this.resolveUrl(path).toString(), {
      method: 'POST',
      headers: this.authHeader(),
      body: formData,
    });
    return this.handleResponse<T>(res);
  }

  /**
   * Multipart POST for audio upload.
   * @param path    API path
   * @param fields  Form text fields
   * @param audio   Audio file descriptor from audioService
   */
  async postMultipart<T = unknown>(
    path: string,
    fields: Record<string, string>,
    audio: AudioFile,
    timeoutMs = AppConstants.uploadTimeoutMs,
  ): Promise<T> {
    const formData = new FormData();
    Object.entries(fields).forEach(([k, v]) => formData.append(k, v));

    const ext = audio.mimeType.includes('ogg') ? 'ogg' : 'webm';
    formData.append('audio', audio.blob, `${audio.questionId}.${ext}`);

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(this.resolveUrl(path).toString(), {
        method: 'POST',
        headers: this.authHeader(),
        body: formData,
        signal: controller.signal,
      });
      return await this.handleResponse<T>(res);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        throw new ApiError('Upload timed out — try a shorter answer or check your connection', 0);
      }
      throw e;
    } finally {
      window.clearTimeout(timeoutId);
    }
  }
}

export const apiClient = new ApiClient();
