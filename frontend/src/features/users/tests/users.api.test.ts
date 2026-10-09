import { beforeEach, expect, it, vi } from "vitest";
const client = vi.hoisted(() => ({ get: vi.fn(), patch: vi.fn() }));
vi.mock("@/lib/axios/client", () => ({ apiClient: client }));
import { getUsers, setAdminRole } from "../api/users.api";
beforeEach(() => vi.resetAllMocks());

it("uses the list contract with cancellation and no invented filtering params", async () => {
  const signal = new AbortController().signal;
  client.get.mockResolvedValue({
    data: { data: { users: [{ id: "id", roles: ["MEMBER", "ADMIN"] }] } },
  });
  expect(await getUsers(signal)).toEqual([
    { id: "id", roles: ["MEMBER", "ADMIN"] },
  ]);
  expect(client.get).toHaveBeenCalledWith("/users", { signal });
});
it.each([true, false])(
  "preserves the ADMIN role mutation payload enabled=%s",
  async (enabled) => {
    const signal = new AbortController().signal;
    await setAdminRole("user-id", enabled, signal);
    expect(client.patch).toHaveBeenCalledWith(
      "/users/user-id/roles/admin",
      { enabled },
      { signal },
    );
  },
);
