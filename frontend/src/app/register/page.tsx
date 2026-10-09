import { AuthPage } from "@/features/auth/components/auth-page";
import { RegisterForm } from "@/features/auth/components/register-form";

export default function RegisterPage() {
  return (
    <AuthPage variant="form">
      <RegisterForm />
    </AuthPage>
  );
}
