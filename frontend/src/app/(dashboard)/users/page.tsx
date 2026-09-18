"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { UserList } from "@/features/users/components/user-list";
import { RoleManager } from "@/features/users/components/role-manager";

type TabKey = "users" | "roles";

function UsersContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab: TabKey = tabParam === "roles" ? "roles" : "users";

  return activeTab === "users" ? <UserList /> : <RoleManager />;
}

export default function UsersPage() {
  return (
    <Suspense fallback={<div className="loading" style={{ padding: "30px" }}>Đang tải…</div>}>
      <UsersContent />
    </Suspense>
  );
}
