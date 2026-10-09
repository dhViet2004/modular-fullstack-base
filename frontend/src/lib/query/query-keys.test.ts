import { describe, expect, it } from "vitest";
import { queryKeys } from "./query-keys";

describe("queryKeys", () => {
  it("provides stable keys for system queries", () => {
    expect(queryKeys.health).toEqual(["health"]);
    expect(queryKeys.system.emailVerification("account-a")).not.toEqual(
      queryKeys.system.emailVerification("account-b"),
    );
    expect(queryKeys.users.list("account-a")).not.toEqual(
      queryKeys.users.list("account-b"),
    );
    expect(queryKeys.auditLogs.list("account-a", { limit: 50 })).not.toEqual(
      queryKeys.auditLogs.list("account-b", { limit: 50 }),
    );
  });

  it("isolates applied audit filters including page size", () => {
    const first = queryKeys.auditLogs.list("account-a", {
      limit: 50,
      action: "AUTH_LOGIN_SUCCEEDED",
    });
    expect(first).not.toEqual(
      queryKeys.auditLogs.list("account-a", { limit: 50 }),
    );
    expect(first).not.toEqual(
      queryKeys.auditLogs.list("account-a", {
        limit: 10,
        action: "AUTH_LOGIN_SUCCEEDED",
      }),
    );
    expect(first).not.toEqual(
      queryKeys.auditLogs.list("account-a", {
        limit: 50,
        actorUserId: "actor",
      }),
    );
  });
});
