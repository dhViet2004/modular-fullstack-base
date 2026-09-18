"use client";

import { Suspense,useEffect,useRef,useState } from "react";
import Link from "next/link";
import { useRouter,useSearchParams } from "next/navigation";
import { Brand } from "@/components/shared/brand";
import { api } from "@/lib/axios/client";
import { authClient,type AuthResult } from "@/lib/auth/auth-client";

function GoogleCallback(){
  const params=useSearchParams(),router=useRouter(),started=useRef(false);
  const [error,setError]=useState("");

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const errorParam = params.get("error");
    const code = params.get("code");

    if (errorParam || !code) {
      if (errorParam === "session_limit_reached") {
        setError("Tài khoản đã đạt giới hạn tối đa số phiên đăng nhập (5 thiết bị). Vui lòng đăng xuất ở thiết bị cũ trước khi tiếp tục.");
      } else if (errorParam === "account_blocked") {
        setError("Tài khoản của bạn đã bị tạm khóa. Vui lòng liên hệ quản trị viên.");
      } else {
        setError("Không thể hoàn tất đăng nhập Google. Vui lòng thử lại.");
      }
      return;
    }

    api.post<{ data: AuthResult }>("/auth/google/exchange", { code })
      .then(({ data }) => {
        authClient.setTokens(data.data);
        router.replace("/dashboard");
      })
      .catch(() => setError("Phiên đăng nhập Google không hợp lệ hoặc đã hết hạn. Vui lòng thử lại."));
  }, [params, router]);

  return <div className="auth-box login-page"><Brand/><h1>{error?"Đăng nhập thất bại":"Đang hoàn tất đăng nhập"}</h1><p className="subtitle">{error||"Vui lòng chờ trong khi chúng tôi thiết lập phiên bảo mật của bạn…"}</p>{error&&<Link className="btn block" href="/login">Quay lại đăng nhập</Link>}</div>;
}

export default function Page(){return <Suspense fallback={<div className="auth-box login-page"><Brand/><p className="subtitle">Đang tải…</p></div>}><GoogleCallback/></Suspense>}
