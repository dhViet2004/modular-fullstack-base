import { describe, it, expect, vi, beforeEach } from "vitest";
import { rbacPolicy } from "../../src/modules/users/rbac/rbac.policy.js";
import { permissionService } from "../../src/modules/users/rbac/permission.service.js";
import { roleService } from "../../src/modules/users/rbac/role.service.js";
import { prisma } from "../../src/core/database/prisma.js";
import { userRepository } from "../../src/modules/users/user.repository.js";
import { auditService } from "../../src/modules/audit/audit.service.js";

vi.mock("../../src/core/database/prisma.js", () => ({
  prisma: {
    user: {
      findUniqueOrThrow: vi.fn()
    },
    role: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn()
    },
    rolePermission: {
      deleteMany: vi.fn(),
      createMany: vi.fn()
    },
    $transaction: vi.fn(async (cb) => cb({
      rolePermission: {
        deleteMany: vi.fn(),
        createMany: vi.fn()
      }
    }))
  }
}));

vi.mock("../../src/modules/users/user.repository.js", () => ({
  userRepository: {
    maxRank: vi.fn()
  }
}));

vi.mock("../../src/modules/audit/audit.service.js", () => ({
  auditService: {
    record: vi.fn()
  }
}));

describe("RBAC Policy", () => {
  it("prevents assigning super admin role by anyone", () => {
    expect(() => rbacPolicy.assertCanAssign(50, 100)).toThrow(/Hệ thống chỉ cho phép duy nhất 1 Super Admin/);
    expect(() => rbacPolicy.assertCanAssign(100, 100)).toThrow(/Hệ thống chỉ cho phép duy nhất 1 Super Admin/);
  });

  it("allows admin assigning admin role to member (roleRank <= actorRank)", () => {
    expect(() => rbacPolicy.assertCanAssign(50, 50)).not.toThrow();
    expect(() => rbacPolicy.assertCanAssign(50, 10)).not.toThrow();
  });

  it("prevents assigning higher rank role than actor rank", () => {
    expect(() => rbacPolicy.assertCanAssign(10, 50)).toThrow(/Không thể gán vai trò có cấp bậc cao hơn vai trò của bạn/);
  });

  it("prevents lower rank editing higher rank", () => {
    expect(() => rbacPolicy.assertCanAct("a", 10, "b", 50)).toThrow();
  });

  it("prevents admin editing another peer admin (rank ngang nhau)", () => {
    expect(() => rbacPolicy.assertCanAct("admin1", 50, "admin2", 50)).toThrow(
      /Không thể thao tác trên tài khoản có cấp bậc tương đương hoặc cao hơn/
    );
  });

  it("prevents user acting on themselves", () => {
    expect(() => rbacPolicy.assertCanAct("admin1", 50, "admin1", 50)).toThrow(/Không thể tự thao tác/);
  });

  it("allows super admin action on admin", () => {
    expect(() => rbacPolicy.assertCanAct("superadmin", 100, "admin", 50)).not.toThrow();
  });

  it("enforces single super admin constraint", () => {
    expect(() => rbacPolicy.assertSingleSuperAdmin(1)).toThrow(/Hệ thống chỉ cho phép duy nhất 1 Super Admin/);
    expect(() => rbacPolicy.assertSingleSuperAdmin(0)).not.toThrow();
  });
});

describe("Level/Rank Hierarchy & Dynamic Permission Overrides", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("inherits all lower rank permissions for higher rank user (ADMIN inherits MEMBER)", async () => {
    const mockUser = {
      id: "admin-user",
      roles: [{ role: { name: "ADMIN", rank: 50 } }],
      permissionOverrides: []
    };

    const mockInheritedRoles = [
      {
        name: "MEMBER",
        rank: 10,
        permissions: [{ permission: { name: "files.read" } }, { permission: { name: "files.upload" } }]
      },
      {
        name: "ADMIN",
        rank: 50,
        permissions: [{ permission: { name: "users.read" } }, { permission: { name: "users.update" } }]
      }
    ];

    vi.mocked(prisma.user.findUniqueOrThrow).mockResolvedValue(mockUser as any);
    vi.mocked(prisma.role.findMany).mockResolvedValue(mockInheritedRoles as any);

    const permissions = await permissionService.resolve("admin-user");

    // Admin phải có cả quyền của MEMBER lẫn ADMIN
    expect(permissions.has("files.read")).toBe(true);
    expect(permissions.has("files.upload")).toBe(true);
    expect(permissions.has("users.read")).toBe(true);
    expect(permissions.has("users.update")).toBe(true);
  });

  it("applies dynamic permission overrides: ALLOW adds permission, DENY removes permission", async () => {
    const mockUser = {
      id: "member-user",
      roles: [{ role: { name: "MEMBER", rank: 10 } }],
      permissionOverrides: [
        { effect: "ALLOW", permission: { name: "users.special.allow" } },
        { effect: "DENY", permission: { name: "files.upload" } }
      ]
    };

    const mockInheritedRoles = [
      {
        name: "MEMBER",
        rank: 10,
        permissions: [{ permission: { name: "files.read" } }, { permission: { name: "files.upload" } }]
      }
    ];

    vi.mocked(prisma.user.findUniqueOrThrow).mockResolvedValue(mockUser as any);
    vi.mocked(prisma.role.findMany).mockResolvedValue(mockInheritedRoles as any);

    const permissions = await permissionService.resolve("member-user");

    expect(permissions.has("files.read")).toBe(true);
    expect(permissions.has("files.upload")).toBe(false);
    expect(permissions.has("users.special.allow")).toBe(true);
  });
});

describe("Role Management & Permission Assignment (RoleService)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("prevents creating role with rank equal or higher than actor rank", async () => {
    vi.mocked(userRepository.maxRank).mockResolvedValue(50); // Actor là Admin (50)
    await expect(roleService.create("admin-id", "NEW_ROLE", 50, [])).rejects.toThrow(
      /Không thể tạo vai trò có cấp bậc ngang hoặc cao hơn/
    );
    await expect(roleService.create("admin-id", "NEW_ROLE", 60, [])).rejects.toThrow(
      /Không thể tạo vai trò có cấp bậc ngang hoặc cao hơn/
    );
  });

  it("allows higher rank to create new role with lower rank and permissions", async () => {
    vi.mocked(userRepository.maxRank).mockResolvedValue(100); // Actor là Super Admin
    vi.mocked(prisma.role.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.role.create).mockResolvedValue({
      id: "new-role-id",
      name: "MODERATOR",
      rank: 30,
      permissions: []
    } as any);

    const role = await roleService.create("super-id", "MODERATOR", 30, ["perm-1", "perm-2"]);
    expect(role.id).toBe("new-role-id");
    expect(prisma.role.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "MODERATOR",
          rank: 30
        })
      })
    );
    expect(auditService.record).toHaveBeenCalled();
  });

  it("prevents updating permissions of role with rank equal or higher than actor rank", async () => {
    vi.mocked(userRepository.maxRank).mockResolvedValue(50); // Actor là Admin (50)
    vi.mocked(prisma.role.findUnique).mockResolvedValue({
      id: "admin-role-id",
      name: "ADMIN",
      rank: 50
    } as any);

    await expect(roleService.updatePermissions("admin-id", "admin-role-id", ["perm-1"])).rejects.toThrow(
      /Không thể chỉnh sửa quyền của vai trò có cấp bậc ngang hoặc cao hơn/
    );
  });

  it("prevents deleting system core roles (SUPER_ADMIN, ADMIN, MEMBER)", async () => {
    vi.mocked(userRepository.maxRank).mockResolvedValue(100); // Super Admin
    vi.mocked(prisma.role.findUnique).mockResolvedValue({
      id: "role-admin-id",
      name: "ADMIN",
      rank: 50
    } as any);

    await expect(roleService.delete("super-id", "role-admin-id")).rejects.toThrow(
      /Không thể xóa vai trò hệ thống cốt lõi/
    );
  });

  it("allows deleting custom role when actor rank is higher", async () => {
    vi.mocked(userRepository.maxRank).mockResolvedValue(50); // Admin (50)
    vi.mocked(prisma.role.findUnique).mockResolvedValue({
      id: "custom-role-id",
      name: "CUSTOM_ROLE",
      rank: 20
    } as any);
    vi.mocked(prisma.role.delete).mockResolvedValue({} as any);

    const res = await roleService.delete("admin-id", "custom-role-id");
    expect(res.success).toBe(true);
    expect(prisma.role.delete).toHaveBeenCalledWith({ where: { id: "custom-role-id" } });
  });
});
