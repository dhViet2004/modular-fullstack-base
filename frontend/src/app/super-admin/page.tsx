import { RoleDashboard } from "@/features/auth/components/role-dashboard";
import { Suspense } from "react";
import { SuperAdminWorkspace } from "@/features/system/components/super-admin-workspace";

export default function SuperAdminPage() {
  return (
    <main className="admin-page">
      <RoleDashboard role="SUPER_ADMIN">
        <Suspense fallback={<p role="status">Đang tải trang...</p>}>
          <SuperAdminWorkspace />
        </Suspense>
      </RoleDashboard>
    </main>
  );
}
