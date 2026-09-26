import { describe, expect, it } from "vitest";
import { queryKeys } from "./query-keys";

describe("queryKeys", () => {
  it("provides stable keys for system queries", () => {
    expect(queryKeys.health).toEqual(["health"]);
    expect(queryKeys.auditLogs.list()).toEqual(["audit-logs", "list"]);
  });
});
