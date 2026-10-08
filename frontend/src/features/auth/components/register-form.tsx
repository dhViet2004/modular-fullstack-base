"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
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
      displayName: "",
    },
  });

  async function onSubmit(values: RegisterFormValues) {
    try {
      await registerMutation.mutateAsync(values);
    } catch (error: unknown) {
      if (axios.isAxiosError<ApiErrorResponse>(error)) {
        const code = error.response?.data.error?.code;

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
            error.response?.data.error?.message ??
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
        <p className="font-mono text-xs font-semibold tracking-[0.14em]">
          ACCOUNT CREATED
        </p>
        <h2 className="my-2.5 text-3xl">
          Welcome, {registerMutation.data.displayName ?? "new user"}.
        </h2>
        <p className="mb-0 leading-6">
          Your account is ready. Login will be added in the next step.
        </p>
      </section>
    );
  }

  return (
    <form className="grid gap-5" onSubmit={handleSubmit(onSubmit)} noValidate>
      <Input
        label="Display name"
        id="displayName"
        type="text"
        autoComplete="name"
        placeholder="Nguyễn Văn A"
        error={errors.displayName?.message}
        {...register("displayName")}
      />

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
        autoComplete="new-password"
        placeholder="At least 12 characters"
        hint="Use at least 12 characters."
        error={errors.password?.message}
        {...register("password")}
      />

      {errors.root?.server ? (
        <InlineAlert variant="error">{errors.root.server.message}</InlineAlert>
      ) : null}

      <Button type="submit" loading={registerMutation.isPending}>
        {registerMutation.isPending ? "Creating account..." : "Create account"}
      </Button>
    </form>
  );
}
