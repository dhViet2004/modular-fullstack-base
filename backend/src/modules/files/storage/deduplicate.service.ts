import { prisma } from "../../../core/database/prisma.js";
import { storage } from "./upload.service.js";
import { env } from "../../../config/env.js";

export const getOrphanStats = async () => {
  const retentionDays = env.FILE_ORPHAN_RETENTION_DAYS;
  const cutoff = new Date(Date.now() - retentionDays * 86400000);
  const totalOrphans = await prisma.storedObject.count({
    where: { referenceCount: 0 }
  });
  const eligibleForCleanup = await prisma.storedObject.count({
    where: {
      referenceCount: 0,
      OR: [
        { pendingDeleteAt: { lte: cutoff } },
        { createdAt: { lte: cutoff } }
      ]
    }
  });
  const retainedOrphans = Math.max(0, totalOrphans - eligibleForCleanup);
  return {
    totalOrphans,
    retainedOrphans,
    eligibleForCleanup,
    retentionDays,
    cutoff: cutoff.toISOString()
  };
};

export const cleanupOrphans = async (force = false) => {
  const retentionDays = env.FILE_ORPHAN_RETENTION_DAYS;
  const cutoff = new Date(Date.now() - retentionDays * 86400000);
  const where = force
    ? { referenceCount: 0 }
    : {
        referenceCount: 0,
        OR: [
          { pendingDeleteAt: { lte: cutoff } },
          { createdAt: { lte: cutoff } }
        ]
      };

  const objects = await prisma.storedObject.findMany({ where });
  let deleted = 0;

  for (const object of objects) {
    try {
      await storage.delete(object.storageKey);
      await prisma.$transaction(async tx => {
        const current = await tx.storedObject.findUnique({ where: { id: object.id } });
        if (!current || current.referenceCount !== 0) return;
        await tx.file.deleteMany({ where: { objectId: object.id, deletedAt: { not: null } } });
        await tx.storedObject.delete({ where: { id: object.id } });
        deleted++;
      });
    } catch {
      /* storage/database failure is retried on the next scheduled run */
    }
  }

  const remainingOrphans = await prisma.storedObject.count({
    where: { referenceCount: 0 }
  });

  return { deleted, retentionDays, remainingOrphans, cutoff: cutoff.toISOString() };
};
