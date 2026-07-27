const trimTrailingSlashes = (value: string): string => value.replace(/\/+$/, '');

export const API_URL = trimTrailingSlashes(
  import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
);

export const SOCKET_URL = trimTrailingSlashes(
  import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000',
);

export const DEVICE_SOCKET_URL = `${SOCKET_URL}/device`;
