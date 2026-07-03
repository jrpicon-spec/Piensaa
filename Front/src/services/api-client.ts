const API_BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '');
const isDev = import.meta.env.DEV;

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

export async function requestJson<T>(
  path: string,
  init?: RequestInit,
  options?: { unwrap?: boolean; devLabel?: string },
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, init);
  const body = await parseJson(response);

  if (isDev && options?.devLabel) {
    console.debug(`[${options.devLabel}] HTTP ${response.status}`, {
      status: response.status,
      ok: response.ok,
      body,
    });
  }

  if (!response.ok) {
    const message =
      (body as { message?: string; error?: string } | null)?.message ??
      (body as { message?: string; error?: string } | null)?.error ??
      'Error en la solicitud';
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
