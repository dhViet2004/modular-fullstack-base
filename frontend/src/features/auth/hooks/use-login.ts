"use client";

import { useMutation } from "@tanstack/react-query";
import { loginUser } from "../api/auth.api";

export function useLogin() {
  return useMutation({
    mutationFn: loginUser,
  });
}