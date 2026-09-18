"use client";

import { Suspense,useEffect,useRef,useState } from "react";
import Link from "next/link";
import { useRouter,useSearchParams } from "next/navigation";
import { Brand } from "@/components/shared/brand";
import { api } from "@/lib/axios/client";
import { authClient,type AuthResult } from "@/lib/auth/auth-client";

function MagicLinkCallback(){
  const params=useSearchParams(),router=useRouter(),started=useRef(false);
  const [error,setError]=useState("");

  useEffect(()=>{
    if(started.current)return;
    started.current=true;
    const code=params.get("code");
    if(params.get("error")||!code){setError("Liên kết đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu liên kết mới.");return}
    api.post<{data:AuthResult}>("/auth/magic-link/exchange",{code})
      .then(({data})=>{authClient.setTokens(data.data);router.replace("/dashboard")})
      .catch(()=>setError("Không thể hoàn tất đăng nhập. Liên kết có thể đã được sử dụng hoặc hết hạn."));
  },[params,router]);

  return <div className="auth-box login-page"><Brand/><h1>{error?"Đăng nhập thất bại":"Đang hoàn tất đăng nhập"}</h1><p className="subtitle">{error||"Vui lòng chờ trong khi chúng tôi thiết lập phiên bảo mật của bạn…"}</p>{error&&<Link className="btn block" href="/login">Quay lại đăng nhập</Link>}</div>;
}

export default function Page(){return <Suspense fallback={<div className="auth-box login-page"><Brand/><p className="subtitle">Đang tải…</p></div>}><MagicLinkCallback/></Suspense>}
