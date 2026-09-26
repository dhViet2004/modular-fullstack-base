"use client";

import { useMutation } from "@tanstack/react-query";

import { verifyEmail } from "../api/auth.api";
import { useAuth } from "../components/auth-provider";

export function useVerifyEmail() {
  const { user, setAuthenticatedUser } = useAuth();

  return useMutation({
    mutationFn: verifyEmail,
    onSuccess: (verifiedUser) => {
      if (user?.id === verifiedUser.id) {
        setAuthenticatedUser({
          ...user,
          emailVerifiedAt: verifiedUser.emailVerifiedAt,
          updatedAt: verifiedUser.updatedAt,
        });
      }
    },
  });
}
