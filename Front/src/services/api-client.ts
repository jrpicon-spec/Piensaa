import { API_URL } from '@/config/runtime';

export { API_URL };
const isDev = import.meta.env.DEV;
const inFlightDevelopmentGets = new Map<string, Promise<unknown>>();

type ApiEnvelope<T> = {
  success?: boolean;
  statusCode?: number;
  data?: T;
  timestamp?: string;
  message?: string;
  error?: string;
};

function parseJson(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    return response.text().then((text) => text || null);
  }
  return response.json().catch(() => null);
}

async function performRequest<T>(
  path: string,
  init?: RequestInit,
  options?: { unwrap?: boolean; devLabel?: string },
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, init);
  const body = await parseJson(response);

  if (isDev && options?.devLabel) {
    console.debug(`[${options.devLabel}] HTTP ${response.status}`, {
      status: response.status,
      ok: response.ok,
      body,
    });
  }

  if (!response.ok) {
    const rawMessage =
      (body as { message?: string | string[]; error?: string } | null)?.message ??
      (body as { message?: string; error?: string } | null)?.error ??
      'Error en la solicitud';
    const message = Array.isArray(rawMessage) ? rawMessage.join(', ') : rawMessage;
    if (isDev && options?.devLabel) {
      console.error(`[${options.devLabel}] Error`, { status: response.status, body });
    }
    throw new Error(message);
  }

  if (options?.unwrap === false) {
    return body as T;
  }

  const envelope = body as ApiEnvelope<T> | null;
  if (envelope && typeof envelope === 'object' && 'data' in envelope) {
    return envelope.data as T;
  }

  return body as T;
}

export function requestJson<T>(
  path: string,
  init?: RequestInit,
  options?: { unwrap?: boolean; devLabel?: string },
): Promise<T> {
  const method = (init?.method ?? 'GET').toUpperCase();
  if (!isDev || method !== 'GET') {
    return performRequest<T>(path, init, options);
  }

  const key = `${method}:${path}`;
  const existing = inFlightDevelopmentGets.get(key);
  if (existing) return existing as Promise<T>;

  const request = performRequest<T>(path, init, options);
  inFlightDevelopmentGets.set(key, request);
  const cleanup = () => {
    if (inFlightDevelopmentGets.get(key) === request) {
      inFlightDevelopmentGets.delete(key);
    }
  };
  void request.then(cleanup, cleanup);
  return request;
}
