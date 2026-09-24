let accessToken: string | null = null;

// Trả access token đang giữ trong bộ nhớ; không đọc localStorage hoặc cookie.
export function getAccessToken(): string | null {
  return accessToken;
}

// Ghi đè access token trong bộ nhớ sau login hoặc refresh thành công.
export function setAccessToken(token: string): void {
  accessToken = token;
}

// Xóa access token khỏi bộ nhớ khi logout hoặc refresh thất bại.
export function clearAccessToken(): void {
  accessToken = null;
}
