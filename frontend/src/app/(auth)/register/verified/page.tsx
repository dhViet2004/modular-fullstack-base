"use client";

import Link from "next/link";
import {Suspense} from "react";
import {useSearchParams} from "next/navigation";
import {Brand} from "@/components/shared/brand";

function Result(){const params=useSearchParams();const success=params.get("success")==="1";return <div className="auth-box login-page"><Brand/><h1>{success?"Xác minh thành công":"Không thể xác minh"}</h1><p className="subtitle">{success?"Email của bạn đã được xác minh. Bây giờ bạn có thể đăng nhập bằng mật khẩu.":"Liên kết không hợp lệ, đã hết hạn hoặc đã được sử dụng trước đó."}</p><Link className="btn block" href={success?"/login":"/register"}>{success?"Đăng nhập":"Đăng ký lại"}</Link></div>}
export default function Page(){return <Suspense><Result/></Suspense>}
