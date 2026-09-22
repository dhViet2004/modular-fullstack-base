"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { useForm } from "react-hook-form";
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
              message: "An account with this email already exists",
            },
            { shouldFocus: true },
          );

          return;
        }

        setError("root.server", {
          type: "server",
          message:
            error.response?.data.error?.message ??
            "Registration failed. Please try again.",
        });

        return;
      }

      setError("root.server", {
        type: "server",
        message: "Registration failed. Please try again.",
      });
    }
  }

  if (registerMutation.isSuccess) {
    return (
      <section className="auth-success" aria-live="polite">
        <p className="eyebrow">ACCOUNT CREATED</p>
        <h2>Welcome, {registerMutation.data.displayName ?? "new user"}.</h2>
        <p>Your account is ready. Login will be added in the next step.</p>
      </section>
    );
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="field-group">
        <label htmlFor="displayName">Display name</label>
        <input
          id="displayName"
          type="text"
          autoComplete="name"
          placeholder="Nguyễn Văn A"
          {...register("displayName")}
        />
        {errors.displayName ? (
          <p className="field-error">{errors.displayName.message}</p>
        ) : null}
      </div>

      <div className="field-group">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          {...register("email")}
        />
        {errors.email ? (
          <p className="field-error">{errors.email.message}</p>
        ) : null}
      </div>

      <div className="field-group">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 12 characters"
          {...register("password")}
        />
        {errors.password ? (
          <p className="field-error">{errors.password.message}</p>
        ) : (
          <p className="field-hint">Use at least 12 characters.</p>
        )}
      </div>

      {errors.root?.server ? (
        <p className="form-error" role="alert">
          {errors.root.server.message}
        </p>
      ) : null}

      <button type="submit" disabled={registerMutation.isPending}>
        {registerMutation.isPending ? "Creating account..." : "Create account"}
      </button>
    </form>
  );
}