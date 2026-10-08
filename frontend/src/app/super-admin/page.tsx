import { RoleDashboard } from "@/features/auth/components/role-dashboard";
import { EmailVerificationSetting } from "@/features/system/components/email-verification-setting";

export default function SuperAdminPage() {
  return (
    <main className="min-h-screen px-[clamp(24px,6vw,88px)] py-16">
      <RoleDashboard role="SUPER_ADMIN">
        <EmailVerificationSetting />
      </RoleDashboard>
    </main>
  );
}
