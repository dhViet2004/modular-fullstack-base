import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.middleware.js";
import { authorize } from "../../middleware/authorize.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { Permission } from "./rbac/permission.constants.js";
import { userController as c } from "./user.controller.js";
import { updateUserSchema } from "./schemas/update-user.schema.js";
import { updateRoleSchema } from "./schemas/update-role.schema.js";
import { changePasswordSchema } from "./schemas/change-password.schema.js";
import { overridePermissionSchema } from "./schemas/override-permission.schema.js";
import { createRoleSchema } from "./schemas/create-role.schema.js";
import { updateRolePermissionsSchema } from "./schemas/update-role-permissions.schema.js";

export const userRoutes = Router();
userRoutes.use(authenticate);

userRoutes.get("/roles", authorize(Permission.USERS_READ), c.roles);
userRoutes.post("/roles", authorize(Permission.ROLES_ASSIGN), validate(createRoleSchema), c.createRole);
userRoutes.put("/roles/:id/permissions", authorize(Permission.ROLES_ASSIGN), validate(updateRolePermissionsSchema), c.updateRolePermissions);
userRoutes.delete("/roles/:id", authorize(Permission.ROLES_ASSIGN), c.deleteRole);

userRoutes.post("/me/change-password", validate(changePasswordSchema), c.changePassword);
userRoutes.get("/me", c.me);

userRoutes.get("/", authorize(Permission.USERS_READ), c.list);
userRoutes.get("/:id", authorize(Permission.USERS_READ), c.detail);
userRoutes.patch("/:id", authorize(Permission.USERS_UPDATE), validate(updateUserSchema), c.update);

userRoutes.post("/:id/block", authorize(Permission.USERS_BLOCK), c.block);
userRoutes.post("/:id/unblock", authorize(Permission.USERS_BLOCK), c.unblock);

userRoutes.post("/:id/roles", authorize(Permission.ROLES_ASSIGN), validate(updateRoleSchema), c.assign);
userRoutes.delete("/:id/roles", authorize(Permission.ROLES_ASSIGN), validate(updateRoleSchema), c.remove);
userRoutes.delete("/:id/roles/:roleId", authorize(Permission.ROLES_ASSIGN), c.remove);

userRoutes.post("/:id/reset-password", authorize(Permission.USERS_UPDATE), c.resetPassword);
userRoutes.get("/:id/permissions", authorize(Permission.USERS_READ), c.getPermissions);
userRoutes.post("/:id/permissions/override", authorize(Permission.ROLES_ASSIGN), validate(overridePermissionSchema), c.overridePermission);
userRoutes.delete("/:id/permissions/override/:permissionId", authorize(Permission.ROLES_ASSIGN), c.removePermissionOverride);
