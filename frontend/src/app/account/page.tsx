import { Suspense } from "react";
import { Skeleton } from "@/components/ui/feedback";
import { AccountPanel } from "@/features/auth/components/account-panel";

export default function AccountPage() {
  return (
    <main className="member-page">
      <Suspense
        fallback={
          <div role="status">
            <p>Đang tải tài khoản...</p>
            <Skeleton />
          </div>
        }
      >
        <AccountPanel />
      </Suspense>
    </main>
  );
}
