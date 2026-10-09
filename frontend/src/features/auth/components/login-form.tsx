"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InlineAlert } from "@/components/ui/feedback";
import { useLogin } from "../hooks/use-login";
import { getPostLoginPath } from "../post-login-route";
import { loginSchema, type LoginFormValues } from "../schemas/login.schema";
import { GoogleLoginButton } from "./google-login-button";

type ApiErrorResponse = {
  error?: {
    code?: string;
    message?: string;
  };
};

// Hiển thị form đăng nhập và chuyển lỗi API thành thông báo dễ hiểu cho người dùng.
export function LoginForm() {
  const router = useRouter();
  const loginMutation = useLogin();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Gửi form qua mutation và ánh xạ từng mã lỗi backend vào form state.
  async function onSubmit(values: LoginFormValues) {
    try {
      const user = await loginMutation.mutateAsync(values);
      const postLoginPath = getPostLoginPath(user.roles);

      if (postLoginPath) {
        router.replace(postLoginPath);
      }
    } catch (error: unknown) {
      if (axios.isAxiosError<ApiErrorResponse>(error)) {
        const code = error.response?.data?.error?.code;

        if (code === "INVALID_CREDENTIALS") {
          setError("root.server", {
            type: "server",
            message: "Email hoặc mật khẩu không đúng",
          });

          return;
        }

        if (code === "ACCOUNT_SUSPENDED") {
          setError("root.server", {
            type: "server",
            message: "Tài khoản đã bị tạm khóa",
          });

          return;
        }
      }

      setError("root.server", {
        type: "server",
        message: "Đăng nhập thất bại. Vui lòng thử lại.",
      });
    }
  }

  if (loginMutation.isSuccess) {
    const postLoginPath = getPostLoginPath(loginMutation.data.roles);

    return (
      <section aria-live="polite">
        <h1>Đăng nhập thành công</h1>
        <p className="auth-description">
          Đang chuyển đến trang phù hợp với quyền của bạn.
        </p>
        <Link className="ui-button auth-link-button mt-6" href={postLoginPath}>
          Mở trang của bạn
        </Link>
      </section>
    );
  }

  return (
    <>
      <header className="auth-heading">
        <h1>Chào mừng trở lại</h1>
        <p className="auth-description">
          Đăng nhập để quản lý tài khoản và tệp của bạn.
        </p>
      </header>
      <form
        className="auth-form"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        aria-busy={loginMutation.isPending}
      >
        {errors.root?.server ? (
          <InlineAlert variant="error">
            {errors.root.server.message}
          </InlineAlert>
        ) : null}
        <Input
          label="Email"
          id="email"
          type="email"
          autoComplete="email"
          placeholder="Nhập email"
          error={errors.email?.message}
          {...register("email")}
        />

        <Input
          label="Mật khẩu"
          id="password"
          type="password"
          autoComplete="current-password"
          placeholder="Nhập mật khẩu"
          error={errors.password?.message}
          {...register("password")}
        />

        <Button type="submit" loading={loginMutation.isPending}>
          {loginMutation.isPending ? "Đang đăng nhập..." : "Đăng nhập"}
        </Button>
      </form>
      <Suspense fallback={null}>
        <GoogleLoginButton />
      </Suspense>
      <p className="auth-switch">
        <Link href="/register">Chưa có tài khoản? Đăng ký</Link>
      </p>
    </>
  );
}
