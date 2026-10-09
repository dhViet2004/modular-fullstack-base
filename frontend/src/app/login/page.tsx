import { AuthPage } from "@/features/auth/components/auth-page";
import { LoginForm } from "@/features/auth/components/login-form";

export default function LoginPage() {
  return (
    <AuthPage variant="form">
      <LoginForm />
    </AuthPage>
  );
}
