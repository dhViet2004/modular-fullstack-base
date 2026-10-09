"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { InlineAlert } from "@/components/ui/feedback";
import { AuthPage, AuthStateCard } from "./auth-page";
import { useAuth } from "./auth-provider";

export function SessionRecovery() {
  const { status, retrySession } = useAuth();
  const expired = status === "expired";
  return (
    <AuthPage>
      <AuthStateCard
        state={expired ? "expired" : "info"}
        title={
          expired ? "Phiên đăng nhập đã hết hạn" : "Không thể khôi phục phiên"
        }
        description={
          expired
            ? "Đăng nhập lại để tiếp tục. Thông tin đang xem sẽ được tải lại an toàn."
            : "Kết nối bị gián đoạn hoặc máy chủ chưa phản hồi. Vui lòng thử khôi phục lại phiên."
        }
      >
        {expired ? (
          <Link className="ui-button auth-link-button" href="/login">
            Đăng nhập lại
          </Link>
        ) : (
          <>
            <InlineAlert>
              Chưa thể kiểm tra trạng thái phiên đăng nhập.
            </InlineAlert>
            <Button onClick={retrySession}>Thử khôi phục lại</Button>
          </>
        )}
      </AuthStateCard>
    </AuthPage>
  );
}
