import { Suspense } from "react";

import { VerifyEmailPanel } from "@/features/auth/components/verify-email-panel";
import { AuthPage, AuthStateCard } from "@/features/auth/components/auth-page";

export default function VerifyEmailPage() {
  return (
    <AuthPage>
      <Suspense
        fallback={
          <AuthStateCard
            state="loading"
            title="Đang tải liên kết"
            description="Vui lòng chờ trong giây lát."
          />
        }
      >
        <VerifyEmailPanel />
      </Suspense>
    </AuthPage>
  );
}
