import { GoogleOAuthCallback } from "@/features/auth/components/google-oauth-callback";
import { AuthPage } from "@/features/auth/components/auth-page";

export default function GoogleOAuthCallbackPage() {
  return (
    <AuthPage>
      <GoogleOAuthCallback />
    </AuthPage>
  );
}
