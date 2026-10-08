import { prisma } from "../../core/database/prisma.js";

export async function isEmailVerificationEnabled() {
  const setting = await prisma.systemSetting.findUnique({ where: { id: 1 } });
  return setting?.emailVerificationEnabled ?? false;
}

export async function setEmailVerificationEnabled(enabled: boolean) {
  return prisma.systemSetting.upsert({
    where: { id: 1 },
    create: { id: 1, emailVerificationEnabled: enabled },
    update: { emailVerificationEnabled: enabled },
    select: { emailVerificationEnabled: true },
  });
}

export const systemService = {
  isEmailVerificationEnabled,
  setEmailVerificationEnabled,
};
