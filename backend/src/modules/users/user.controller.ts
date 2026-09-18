import type { RequestHandler } from "express"; import { success } from "../../core/http/api-response.js"; import { userService } from "./user.service.js"; import { roleService } from "./rbac/role.service.js"; import { prisma } from "../../core/database/prisma.js"; import { passwordService } from "./password/password.service.js"; import { permissionService } from "./rbac/permission.service.js";
export const userController: { [k: string]: RequestHandler } = {
  me: async (_q, r, n) => {
    try {
      const userId = r.locals.auth.userId;
      const user = await prisma.user.findUniqueOrThrow({
        where: { id: userId },
        include: {
          roles: {
            include: { role: true },
            orderBy: { role: { rank: "desc" } }
          }
        }
      });
      const credential = await prisma.passwordCredential.findUnique({
        where: { userId },
        select: { mustChangePassword: true }
      });
      const permissions = await permissionService.resolve(userId);
      r.json(
        success({
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          mustChangePassword: Boolean(credential?.mustChangePassword),
          roles: user.roles.map(({ role }) => ({ name: role.name, rank: role.rank })),
          permissions: Array.from(permissions)
        })
      );
    } catch (e) {
      n(e);
    }
  },
  list: async (q, r, n) => {
    try {
      r.json(success(await userService.list(Number(q.query.page) || 1, Math.min(Number(q.query.limit) || 20, 100))));
    } catch (e) {
      n(e);
    }
  },
  detail: async (q, r, n) => {
    try {
      r.json(success(await userService.detail(String(q.params.id))));
    } catch (e) {
      n(e);
    }
  },
  update: async (q, r, n) => {
    try {
      r.json(success(await userService.update(String(q.params.id), q.body)));
    } catch (e) {
      n(e);
    }
  },
  block: async (q, r, n) => {
    try {
      await userService.setBlocked(r.locals.auth.userId, String(q.params.id), true);
      r.json(success({ blocked: true }));
    } catch (e) {
      n(e);
    }
  },
  unblock: async (q, r, n) => {
    try {
      await userService.setBlocked(r.locals.auth.userId, String(q.params.id), false);
      r.json(success({ blocked: false }));
    } catch (e) {
      n(e);
    }
  },
  roles: async (_q, r, n) => {
    try {
      r.json(success({ roles: await roleService.list(), permissions: await prisma.permission.findMany({ orderBy: { name: "asc" } }) }));
    } catch (e) {
      n(e);
    }
  },
  createRole: async (q, r, n) => {
    try {
      const role = await roleService.create(r.locals.auth.userId, q.body.name, q.body.rank, q.body.permissionIds);
      r.status(201).json(success(role));
    } catch (e) {
      n(e);
    }
  },
  updateRolePermissions: async (q, r, n) => {
    try {
      const updated = await roleService.updatePermissions(
        r.locals.auth.userId,
        String(q.params.id),
        q.body.permissionIds
      );
      r.json(success(updated));
    } catch (e) {
      n(e);
    }
  },
  deleteRole: async (q, r, n) => {
    try {
      const result = await roleService.delete(r.locals.auth.userId, String(q.params.id));
      r.json(success(result));
    } catch (e) {
      n(e);
    }
  },
  assign: async (q, r, n) => {
    try {
      await userService.role(r.locals.auth.userId, String(q.params.id), q.body.roleId, true);
      r.json(success({ assigned: true }));
    } catch (e) {
      n(e);
    }
  },
  remove: async (q, r, n) => {
    try {
      const roleId = String(q.params.roleId || q.body?.roleId || q.query?.roleId);
      await userService.role(r.locals.auth.userId, String(q.params.id), roleId, false);
      r.json(success({ removed: true }));
    } catch (e) {
      n(e);
    }
  },
  resetPassword: async (q, r, n) => {
    try {
      const result = await userService.resetUserPassword(r.locals.auth.userId, String(q.params.id));
      r.json(success(result));
    } catch (e) {
      n(e);
    }
  },
  getPermissions: async (q, r, n) => {
    try {
      r.json(success(await userService.getPermissions(String(q.params.id))));
    } catch (e) {
      n(e);
    }
  },
  overridePermission: async (q, r, n) => {
    try {
      r.json(
        success(
          await userService.overridePermission(
            r.locals.auth.userId,
            String(q.params.id),
            q.body.permissionId,
            q.body.effect
          )
        )
      );
    } catch (e) {
      n(e);
    }
  },
  removePermissionOverride: async (q, r, n) => {
    try {
      r.json(
        success(
          await userService.removePermissionOverride(
            r.locals.auth.userId,
            String(q.params.id),
            String(q.params.permissionId)
          )
        )
      );
    } catch (e) {
      n(e);
    }
  },
  changePassword: async (q, r, n) => {
    try {
      await passwordService.change(
        r.locals.auth.userId,
        q.body.currentPassword,
        q.body.newPassword,
        q.body.revokeOtherSessions,
        r.locals.auth.sessionId
      );
      r.json(success({ changed: true }));
    } catch (e) {
      n(e);
    }
  }
};
