"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InlineAlert } from "@/components/ui/feedback";
import { useLogin } from "../hooks/use-login";
import { getPostLoginPath } from "../post-login-route";
import { loginSchema, type LoginFormValues } from "../schemas/login.schema";

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
        const code = error.response?.data.error?.code;

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
        <p className="font-mono text-xs font-semibold tracking-[0.14em]">
          CREDENTIALS VERIFIED
        </p>
        <h2 className="my-2.5 text-3xl">Welcome back.</h2>
        <p className="mb-0 leading-6">{loginMutation.data.email}</p>
        <Link
          className="mt-5 inline-block font-semibold underline decoration-[var(--signal)] decoration-2 underline-offset-4"
          href={postLoginPath}
        >
          Mở trang của bạn
        </Link>
      </section>
    );
  }

  return (
    <form className="grid gap-5" onSubmit={handleSubmit(onSubmit)} noValidate>
      <Input
        label="Email"
        id="email"
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        error={errors.email?.message}
        {...register("email")}
      />

      <Input
        label="Password"
        id="password"
        type="password"
        autoComplete="current-password"
        placeholder="Your password"
        error={errors.password?.message}
        {...register("password")}
      />

      {errors.root?.server ? (
        <InlineAlert variant="error">{errors.root.server.message}</InlineAlert>
      ) : null}

      <Button type="submit" loading={loginMutation.isPending}>
        {loginMutation.isPending ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );
}
