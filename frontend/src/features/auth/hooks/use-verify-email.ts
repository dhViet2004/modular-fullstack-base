"use client";

import { useMutation } from "@tanstack/react-query";

import { verifyEmail } from "../api/auth.api";
import { useAuth } from "../components/auth-provider";

export function useVerifyEmail() {
  const { updateVerifiedEmail } = useAuth();

  return useMutation({
    mutationFn: verifyEmail,
    onSuccess: updateVerifiedEmail,
  });
}
