"use client";

import { useLogout } from "../hooks/use-logout";

export function LogoutButton() {
  const logoutMutation = useLogout();

  return (
    <button
      className="cursor-pointer border-0 bg-transparent p-0 font-mono text-sm underline underline-offset-4 disabled:cursor-wait disabled:opacity-60"
      type="button"
      disabled={logoutMutation.isPending}
      onClick={() => logoutMutation.mutate()}
    >
      {logoutMutation.isPending ? "Đang đăng xuất..." : "Đăng xuất"}
    </button>
  );
}
