const ACCESS_TOKEN_KEY = 'accessToken';
const LEGACY_TOKEN_KEY = 'reaccionvital:token';

export function getStoredToken(): string | null {
  const token =
    sessionStorage.getItem(ACCESS_TOKEN_KEY) ??
    localStorage.getItem(ACCESS_TOKEN_KEY) ??
    localStorage.getItem(LEGACY_TOKEN_KEY);
  if (token) {
    sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(LEGACY_TOKEN_KEY);
  }
  return token;
}

export function setStoredToken(token: string): void {
  sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(LEGACY_TOKEN_KEY);
}

export function clearStoredToken(): void {
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(LEGACY_TOKEN_KEY);
}
