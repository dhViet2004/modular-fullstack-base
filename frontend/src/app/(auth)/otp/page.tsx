"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Brand } from "@/components/shared/brand";
import { authApi } from "@/features/auth/api/auth.api";
import { useOtpVerify } from "@/features/auth/hooks/use-auth";
import { apiError } from "@/lib/axios/interceptors";

export default function Page() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [requestError, setRequestError] = useState<unknown>();
  const verify = useOtpVerify();
  const router = useRouter();
  const verifyError = apiError(verify.error);

  const send = async () => {
    setSending(true);
    setRequestError(undefined);
    try {
      await authApi.requestOtp(email);
      setSent(true);
    } catch (error) {
      setRequestError(error);
    } finally {
      setSending(false);
    }
  };

  return <div className="auth-box login-page"><Brand/><h1>Đăng nhập bằng mã email</h1><p className="subtitle">Chúng tôi sẽ gửi một mã dùng một lần an toàn đến email của bạn.</p><div className="auth-tabs"><Link href="/login">Mật khẩu</Link><Link className="active" href="/otp">Mã email</Link></div><label className="field"><span>Địa chỉ email</span><input className="input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="ban@congty.com"/></label>{requestError!==undefined&&<p className="error">{apiError(requestError).message}</p>}{sent&&<p className="success">Mã đã được gửi. Vui lòng kiểm tra hộp thư của bạn.</p>}<button className="btn secondary block" disabled={!email||sending} onClick={send}>{sending?"Đang gửi…":sent?"Gửi lại mã xác minh":"Gửi mã xác minh"}</button>{sent&&<><div className="divider">nhập mã của bạn</div><label className="field"><span>Mã gồm 6 chữ số</span><input className="input" inputMode="numeric" maxLength={6} value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g,""))} placeholder="000000"/></label>{verify.isError&&<p className="error">{verifyError.code==="SESSION_LIMIT_REACHED"?"Tài khoản đã đạt giới hạn 5 phiên đăng nhập. Hãy mở một thiết bị đang đăng nhập, vào mục Phiên đăng nhập để thu hồi một phiên cũ, sau đó gửi và nhập mã OTP mới.":verifyError.message}</p>}<button className="btn block" disabled={verify.isPending||otp.length<6} onClick={()=>verify.mutate({email,otp},{onSuccess:()=>router.push("/dashboard")})}>{verify.isPending?"Đang xác minh…":"Xác minh và đăng nhập"}</button></>}<p className="helper"><Link href="/login">← Quay lại đăng nhập bằng mật khẩu</Link></p></div>;
}
