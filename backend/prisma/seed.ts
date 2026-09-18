import argon2 from "argon2";
import { PrismaClient } from "../src/generated/prisma/client.js";

const prisma = new PrismaClient();
const permissions = [
  "users.read","users.create","users.update","users.block","users.unblock",
  "users.roles.read","users.roles.assign","users.roles.promote","users.roles.demote",
  "files.read","files.upload","files.delete","files.import","files.export",
  "sessions.read","sessions.revoke",
  "mail.read","mail.send",
  "jobs.read","jobs.create","jobs.update","jobs.delete","jobs.run",
  "system.settings.read","system.settings.update",
  "audit.read"
];
const roles = [{name:"SUPER_ADMIN",rank:100},{name:"ADMIN",rank:50},{name:"MEMBER",rank:10}];

async function main() {
  for (const role of roles) await prisma.role.upsert({where:{name:role.name},update:{rank:role.rank},create:role});
  for (const name of permissions) await prisma.permission.upsert({where:{name},update:{},create:{name}});
  const allPermissions = await prisma.permission.findMany();
  for (const role of await prisma.role.findMany()) {
    const allowed = role.name === "SUPER_ADMIN" ? allPermissions : allPermissions.filter((p) => role.name === "ADMIN" ? !p.name.includes("promote") : ["files.read","files.upload","sessions.read","sessions.revoke"].includes(p.name));
    for (const permission of allowed) await prisma.rolePermission.upsert({where:{roleId_permissionId:{roleId:role.id,permissionId:permission.id}},update:{},create:{roleId:role.id,permissionId:permission.id}});
  }

  // Seed Scheduled Jobs mặc định
  const defaultJobs = [
    {
      name: "Tự động dọn dẹp tệp mồ côi (10 ngày)",
      description: "Quét và xóa vĩnh viễn các tệp vật lý mồ côi đã quá hạn 10 ngày khỏi bộ nhớ",
      taskType: "CLEANUP_ORPHAN_FILES" as const,
      queue: "files.cleanup-orphans",
      cron: "0 2 * * *",
      payload: { force: false },
      enabled: true,
      runOnServer: true
    },
    {
      name: "Dọn dẹp mã OTP & liên kết xác thực hết hạn",
      description: "Xóa các mã OTP, Magic Link và liên kết xác thực đã hết hạn hoặc đã tiêu thụ",
      taskType: "CLEANUP_CHALLENGES" as const,
      queue: "auth.cleanup-challenges",
      cron: "0 * * * *",
      payload: {},
      enabled: true,
      runOnServer: true
    },
    {
      name: "Thu hồi các phiên đăng nhập hết hạn",
      description: "Quét và thu hồi các phiên đăng nhập quá hạn hiệu lực",
      taskType: "CLEANUP_EXPIRED_SESSIONS" as const,
      queue: "sessions.cleanup-expired",
      cron: "15 * * * *",
      payload: {},
      enabled: true,
      runOnServer: true
    },
    {
      name: "Dọn dẹp nhật ký kiểm toán cũ (Audit Logs)",
      description: "Tự động xóa các bản ghi nhật ký kiểm toán hệ thống cũ hơn 90 ngày",
      taskType: "CLEANUP_AUDIT_LOGS" as const,
      queue: "system.cleanup-audit",
      cron: "0 3 * * 0",
      payload: { retentionDays: 90 },
      enabled: true,
      runOnServer: true
    },
    {
      name: "Cập nhật tài khoản không hoạt động",
      description: "Quét và cập nhật trạng thái tạm khóa (SUSPENDED) cho người dùng không đăng nhập quá 180 ngày",
      taskType: "UPDATE_INACTIVE_USERS" as const,
      queue: "users.update-inactive",
      cron: "0 4 1 * *",
      payload: { inactiveDays: 180, targetStatus: "SUSPENDED" },
      enabled: false,
      runOnServer: true
    }
  ];

  for (const job of defaultJobs) {
    const existing = await prisma.scheduledJob.findFirst({ where: { name: job.name } });
    if (!existing) {
      await prisma.scheduledJob.create({ data: job });
    }
  }

  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  const googleSuperAdminBootstrapEnabled = process.env.SUPER_ADMIN_BOOTSTRAP_ENABLED === "true";
  if (email && password && !googleSuperAdminBootstrapEnabled) {
    const user = await prisma.user.upsert({where:{email},update:{},create:{email,emailVerifiedAt:new Date()}});
    const hash = await argon2.hash(password,{type:argon2.argon2id});
    await prisma.passwordCredential.upsert({where:{userId:user.id},update:{passwordHash:hash,passwordChangedAt:new Date()},create:{userId:user.id,passwordHash:hash}});
    const role = await prisma.role.findUniqueOrThrow({where:{name:"SUPER_ADMIN"}});
    await prisma.userRole.upsert({where:{userId_roleId:{userId:user.id,roleId:role.id}},update:{},create:{userId:user.id,roleId:role.id}});
  }
}
main().finally(() => prisma.$disconnect());
