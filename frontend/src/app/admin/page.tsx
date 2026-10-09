import { RoleDashboard } from "@/features/auth/components/role-dashboard";

export default function AdminPage() {
  return (
    <main className="admin-page">
      <RoleDashboard role="ADMIN" />
    </main>
  );
}
