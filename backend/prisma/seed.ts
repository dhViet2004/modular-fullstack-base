import argon2 from "argon2";
import { PrismaClient } from "../src/generated/prisma/client.js";

const prisma = new PrismaClient();
const permissions = ["users.read","users.create","users.update","users.block","users.unblock","users.roles.read","users.roles.assign","users.roles.promote","users.roles.demote","files.read","files.upload","files.delete","files.import","files.export","sessions.read","sessions.revoke","mail.read","mail.send","system.settings.read","system.settings.update","audit.read"];
const roles = [{name:"SUPER_ADMIN",rank:100},{name:"ADMIN",rank:50},{name:"MEMBER",rank:10}];

async function main() {
  for (const role of roles) await prisma.role.upsert({where:{name:role.name},update:{rank:role.rank},create:role});
  for (const name of permissions) await prisma.permission.upsert({where:{name},update:{},create:{name}});
  const allPermissions = await prisma.permission.findMany();
  for (const role of await prisma.role.findMany()) {
    const allowed = role.name === "SUPER_ADMIN" ? allPermissions : allPermissions.filter((p) => role.name === "ADMIN" ? !p.name.includes("promote") : ["files.read","files.upload","sessions.read","sessions.revoke"].includes(p.name));
    for (const permission of allowed) await prisma.rolePermission.upsert({where:{roleId_permissionId:{roleId:role.id,permissionId:permission.id}},update:{},create:{roleId:role.id,permissionId:permission.id}});
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
