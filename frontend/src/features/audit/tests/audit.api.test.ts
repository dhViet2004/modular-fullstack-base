import { beforeEach, expect, it, vi } from "vitest";
import { AUDIT_ACTIONS as backendActions } from "../../../../../backend/src/modules/audit/audit.catalog";
const client = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@/lib/axios/client", () => ({ apiClient: client }));
import { AUDIT_ACTIONS, getAuditLogs } from "../api/audit.api";
beforeEach(() => vi.resetAllMocks());

it("keeps the frontend action options within the actual backend catalog", () => {
  expect([...AUDIT_ACTIONS].sort()).toEqual(
    Object.values(backendActions).sort(),
  );
});
it("passes only supported applied filters, the opaque cursor and cancellation", async () => {
  const signal = new AbortController().signal;
  client.get.mockResolvedValue({
    data: { data: { auditLogs: [], nextCursor: "opaque-next" } },
  });
  const filters = {
    limit: 10,
    actorUserId: "actor-uuid",
    action: "AUTH_LOGIN_SUCCEEDED" as const,
    outcome: "SUCCESS",
  };
  expect(await getAuditLogs("opaque-current", filters, signal)).toEqual({
    auditLogs: [],
    nextCursor: "opaque-next",
  });
  expect(client.get).toHaveBeenCalledWith("/audit-logs", {
    params: {
      limit: 10,
      actorUserId: "actor-uuid",
      action: "AUTH_LOGIN_SUCCEEDED",
      cursor: "opaque-current",
    },
    signal,
  });
});
it("does not send an invented initial cursor", async () => {
  client.get.mockResolvedValue({
    data: { data: { auditLogs: [], nextCursor: null } },
  });
  await getAuditLogs(null, { limit: 50 });
  expect(client.get).toHaveBeenCalledWith("/audit-logs", {
    params: { limit: 50 },
    signal: undefined,
  });
});
