import { RoleDashboard } from "@/features/auth/components/role-dashboard";

export default function AdminPage() {
  return <main className="min-h-screen px-[clamp(24px,6vw,88px)] py-16"><RoleDashboard role="ADMIN" /></main>;
}
