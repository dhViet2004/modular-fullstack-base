"use client";

import { useMutation } from "@tanstack/react-query";

import { requestEmailVerification } from "../api/auth.api";

export function useRequestEmailVerification() {
  return useMutation({ mutationFn: requestEmailVerification });
}
