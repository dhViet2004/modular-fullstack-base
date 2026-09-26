import { PERMISSIONS } from "./permissions";

// Chỉ điều hướng vào trang quản trị khi backend đã cấp đúng permission.
export function getPostLoginPath(permissions: string[]) {
  return permissions.includes(PERMISSIONS.USERS_READ) ? "/admin/users" : null;
}
