import type { RequestHandler } from "express";

import { assertUserHasPermission } from "../modules/access/access.service.js";
import type { PermissionCode } from "../modules/access/permission.catalog.js";

// Nhận permission lúc khai báo route và trả middleware kiểm tra user đã authenticate.
export function authorize(permission: PermissionCode): RequestHandler {
  return async (request, _response, next) => {
    await assertUserHasPermission(request.auth.user.id, permission);
    next();
  };
}
