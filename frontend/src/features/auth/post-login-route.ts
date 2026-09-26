// Chỉ điều hướng vào trang quản trị khi backend đã cấp đúng permission.
export function getPostLoginPath(permissions: string[]) {
  return permissions.includes("users:read") ? "/admin/users" : null;
}
