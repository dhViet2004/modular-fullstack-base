let accessToken: string | null = null;
let requestVersion = 0;

export function getAuthRequestVersion(): number {
  return requestVersion;
}

// Login/logout/explicit restoration invalidate old work; same-session rotation does not.
export function invalidateSessionRequests(): void {
  requestVersion++;
  if (typeof window !== "undefined")
    window.dispatchEvent(new Event("auth:requests-invalidated"));
}

// Trả access token đang giữ trong bộ nhớ; không đọc localStorage hoặc cookie.
export function getAccessToken(): string | null {
  return accessToken;
}

// Ghi đè access token trong bộ nhớ sau login hoặc refresh thành công.
export function setAccessToken(token: string, isRefresh = false): void {
  if (!isRefresh) invalidateSessionRequests();
  accessToken = token;
}

// Xóa access token khỏi bộ nhớ khi logout hoặc refresh thất bại.
export function clearAccessToken(): void {
  invalidateSessionRequests();
  accessToken = null;
}
