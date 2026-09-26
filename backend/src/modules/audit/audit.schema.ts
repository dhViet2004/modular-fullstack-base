import { z } from "zod";

import { AUDIT_ACTIONS } from "./audit.catalog.js";

export const listAuditLogsQuerySchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  action: z.enum(Object.values(AUDIT_ACTIONS)).optional(),
  actorUserId: z.string().uuid().optional(),
});

export type ListAuditLogsQuery = z.infer<typeof listAuditLogsQuerySchema>;
