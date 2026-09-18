"use client";

import Link from "next/link";
import { useState } from "react";
import { Brand } from "@/components/shared/brand";
import { authApi } from "@/features/auth/api/auth.api";
import { apiError } from "@/lib/axios/interceptors";

export default function Page() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>();

  const submit = async () => {
    setPending(true);
    setError(undefined);
    try {
      await authApi.requestMagic(email);
      setSent(true);
    } catch (requestError) {
      setError(requestError);
    } finally {
      setPending(false);
    }
  };

  return <div className="auth-box login-page"><Brand/><h1>Đăng nhập bằng liên kết</h1><p className="subtitle">Không cần mật khẩu. Chúng tôi sẽ gửi một liên kết đăng nhập an toàn đến email của bạn.</p><div className="auth-tabs"><Link href="/login">Mật khẩu</Link><Link href="/otp">Mã email</Link><Link className="active" href="/magic-link">Liên kết</Link></div>{sent?<div className="success"><strong>Kiểm tra hộp thư của bạn</strong><br/>Liên kết đăng nhập đã được gửi đến {email}.</div>:<><label className="field"><span>Địa chỉ email</span><input className="input" type="email" value={email} onChange={(event)=>setEmail(event.target.value)} placeholder="ban@congty.com"/></label>{error!==undefined&&<p className="error">{apiError(error).message}</p>}<button className="btn block" disabled={!email||pending} onClick={submit}>{pending?"Đang gửi…":"Gửi liên kết đăng nhập"}</button></>}<p className="helper"><Link href="/login">← Quay lại đăng nhập bằng mật khẩu</Link></p></div>;
}
