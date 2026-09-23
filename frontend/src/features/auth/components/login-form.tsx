"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { useForm } from "react-hook-form";
import { useLogin } from "../hooks/use-login";
import {
  loginSchema,
  type LoginFormValues,
} from "../schemas/login.schema";


type ApiErrorResponse = {
  error?: {
    code?: string;
    message?: string;
  };
};

export function LoginForm() {
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

  async function onSubmit(values: LoginFormValues) {
    try {
      await loginMutation.mutateAsync(values);
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
    return (
      <section aria-live="polite">
        <p className="font-mono text-xs font-semibold tracking-[0.14em]">
          CREDENTIALS VERIFIED
        </p>
        <h2 className="my-2.5 text-3xl">Welcome back.</h2>
        <p className="mb-0 leading-6">{loginMutation.data.email}</p>
      </section>
    );
  }

  return (
    <form
      className="grid gap-5"
      onSubmit={handleSubmit(onSubmit)}
      noValidate
    >
      <div className="grid gap-2">
        <label
          className="font-mono text-xs font-semibold tracking-[0.08em] uppercase"
          htmlFor="email"
        >
          Email
        </label>
        <input
          className="w-full rounded-none border border-[var(--ink)] bg-transparent px-3.5 py-3.25 font-[inherit] text-[var(--ink)] outline-none focus:border-[var(--signal)] focus:shadow-[4px_4px_0_rgba(237,93,42,0.24)]"
          id="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          {...register("email")}
        />
        {errors.email ? (
          <p className="m-0 text-sm leading-5 text-[#b52f1d]">
            {errors.email.message}
          </p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <label
          className="font-mono text-xs font-semibold tracking-[0.08em] uppercase"
          htmlFor="password"
        >
          Password
        </label>
        <input
          className="w-full rounded-none border border-[var(--ink)] bg-transparent px-3.5 py-3.25 font-[inherit] text-[var(--ink)] outline-none focus:border-[var(--signal)] focus:shadow-[4px_4px_0_rgba(237,93,42,0.24)]"
          id="password"
          type="password"
          autoComplete="current-password"
          placeholder="Your password"
          {...register("password")}
        />
        {errors.password ? (
          <p className="m-0 text-sm leading-5 text-[#b52f1d]">
            {errors.password.message}
          </p>
        ) : null}
      </div>

      {errors.root?.server ? (
        <p className="m-0 text-sm leading-5 text-[#b52f1d]" role="alert">
          {errors.root.server.message}
        </p>
      ) : null}

      <button
        className="min-h-12 cursor-pointer border border-[var(--ink)] bg-[var(--ink)] px-4.5 py-3 font-mono text-xs font-semibold tracking-[0.08em] text-[var(--paper)] uppercase hover:bg-[var(--signal)] hover:text-[var(--ink)] disabled:cursor-wait disabled:opacity-65"
        type="submit"
        disabled={loginMutation.isPending}
      >
        {loginMutation.isPending ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
