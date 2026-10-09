"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InlineAlert } from "@/components/ui/feedback";
import { useRegister } from "../hooks/use-register";
import {
  registerSchema,
  type RegisterFormValues,
} from "../schemas/register.schema";

type ApiErrorResponse = {
  error?: {
    code?: string;
    message?: string;
  };
};

export function RegisterForm() {
  const registerMutation = useRegister();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      displayName: "",
    },
  });

  async function onSubmit(values: RegisterFormValues) {
    try {
      await registerMutation.mutateAsync(values);
    } catch (error: unknown) {
      if (axios.isAxiosError<ApiErrorResponse>(error)) {
        const code = error.response?.data?.error?.code;

        if (code === "USER_EMAIL_ALREADY_EXISTS") {
          setError(
            "email",
            {
              type: "server",
              message: "Email này đã được đăng ký",
            },
            { shouldFocus: true },
          );

          return;
        }

        setError("root.server", {
          type: "server",
          message:
            error.response?.data?.error?.message ??
            "Đăng ký thất bại. Vui lòng thử lại.",
        });

        return;
      }

      setError("root.server", {
        type: "server",
        message: "Đăng ký thất bại. Vui lòng thử lại.",
      });
    }
  }

  if (registerMutation.isSuccess) {
    return (
      <section aria-live="polite">
        <header className="auth-heading">
          <h1>Tạo tài khoản</h1>
          <p className="auth-description">
            Bắt đầu với không gian tài khoản riêng của bạn.
          </p>
        </header>
        <InlineAlert variant="success">
          <strong>Tạo tài khoản thành công</strong>
          <br />
          Bạn có thể đăng nhập bằng email vừa đăng ký.
        </InlineAlert>
        <Link className="ui-button auth-link-button mt-6" href="/login">
          Đăng nhập
        </Link>
      </section>
    );
  }

  return (
    <>
      <header className="auth-heading">
        <h1>Tạo tài khoản</h1>
        <p className="auth-description">
          Bắt đầu với không gian tài khoản riêng của bạn.
        </p>
      </header>
      <form
        className="auth-form"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        aria-busy={registerMutation.isPending}
      >
        <Input
          label="Họ tên hiển thị (không bắt buộc)"
          id="displayName"
          type="text"
          autoComplete="name"
          placeholder="Nhập họ tên"
          error={errors.displayName?.message}
          {...register("displayName")}
        />

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
          autoComplete="new-password"
          placeholder="Nhập mật khẩu"
          hint="Từ 12–128 ký tự."
          error={errors.password?.message}
          {...register("password")}
        />

        <Input
          label="Nhập lại mật khẩu"
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          placeholder="Nhập lại mật khẩu"
          hint="Chỉ dùng để xác nhận trên giao diện."
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />

        {errors.root?.server ? (
          <InlineAlert variant="error">
            {errors.root.server.message}
          </InlineAlert>
        ) : null}

        <Button type="submit" loading={registerMutation.isPending}>
          {registerMutation.isPending
            ? "Đang tạo tài khoản..."
            : "Tạo tài khoản"}
        </Button>
      </form>
      <p className="auth-switch">
        <Link href="/login">Đã có tài khoản? Đăng nhập</Link>
      </p>
    </>
  );
}
