import { beforeEach, describe, expect, it, vi } from "vitest";

const repositoryMocks = vi.hoisted(() => ({
  createAuditLog: vi.fn(),
  findAuditLogs: vi.fn(),
}));

vi.mock("./audit.repository.js", () => ({
  createAuditLog: repositoryMocks.createAuditLog,
  findAuditLogs: repositoryMocks.findAuditLogs,
}));

import {
  AUDIT_ACTIONS,
  AUDIT_OUTCOMES,
  AUDIT_SUBJECT_TYPES,
} from "./audit.catalog.js";
import { listAuditLogs, recordAuditEvent } from "./audit.service.js";

const createAuditLogMock = repositoryMocks.createAuditLog;
const findAuditLogsMock = repositoryMocks.findAuditLogs;

describe("audit service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("records a normalized audit event", async () => {
    createAuditLogMock.mockResolvedValue({ id: "audit-id" });

    await recordAuditEvent({
      action: AUDIT_ACTIONS.AUTH_LOGIN_SUCCEEDED,
      outcome: AUDIT_OUTCOMES.SUCCESS,
      actorUserId: "11111111-1111-4111-8111-111111111111",
      subjectType: AUDIT_SUBJECT_TYPES.SESSION,
      subjectId: "22222222-2222-4222-8222-222222222222",
      sessionId: "22222222-2222-4222-8222-222222222222",
      ipAddress: " 127.0.0.1 ",
      userAgent: " Test Browser ",
    });

    expect(createAuditLogMock).toHaveBeenCalledWith({
      action: AUDIT_ACTIONS.AUTH_LOGIN_SUCCEEDED,
      outcome: AUDIT_OUTCOMES.SUCCESS,
      actorUserId: "11111111-1111-4111-8111-111111111111",
      subjectType: AUDIT_SUBJECT_TYPES.SESSION,
      subjectId: "22222222-2222-4222-8222-222222222222",
      sessionId: "22222222-2222-4222-8222-222222222222",
      ipAddress: "127.0.0.1",
      userAgent: "Test Browser",
    });
  });

  it("drops an invalid IP address and limits the user agent length", async () => {
    createAuditLogMock.mockResolvedValue({ id: "audit-id" });

    await recordAuditEvent({
      action: AUDIT_ACTIONS.AUTH_LOGIN_FAILED,
      outcome: AUDIT_OUTCOMES.FAILURE,
      ipAddress: "not-an-ip",
      userAgent: "x".repeat(600),
    });

    expect(createAuditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        ipAddress: null,
        userAgent: "x".repeat(512),
      }),
    );
  });

  it("returns a stable cursor when another page exists", async () => {
    const records = [
      {
        id: "11111111-1111-4111-8111-111111111111",
        createdAt: new Date("2026-09-26T03:00:00.000Z"),
      },
      {
        id: "22222222-2222-4222-8222-222222222222",
        createdAt: new Date("2026-09-26T02:00:00.000Z"),
      },
      {
        id: "33333333-3333-4333-8333-333333333333",
        createdAt: new Date("2026-09-26T01:00:00.000Z"),
      },
    ];
    findAuditLogsMock.mockResolvedValue(records);

    const page = await listAuditLogs({ limit: 2 });

    expect(page.auditLogs).toEqual(records.slice(0, 2));
    expect(page.nextCursor).toEqual(expect.any(String));

    findAuditLogsMock.mockResolvedValue([]);
    await listAuditLogs({ limit: 2, cursor: page.nextCursor as string });

    expect(findAuditLogsMock).toHaveBeenLastCalledWith({
      limit: 2,
      cursor: {
        id: records[1]?.id,
        createdAt: records[1]?.createdAt,
      },
    });
  });

  it("rejects a malformed cursor", async () => {
    await expect(
      listAuditLogs({ limit: 50, cursor: "invalid-cursor" }),
    ).rejects.toMatchObject({ statusCode: 400, code: "VALIDATION_ERROR" });

    expect(findAuditLogsMock).not.toHaveBeenCalled();
  });
});
