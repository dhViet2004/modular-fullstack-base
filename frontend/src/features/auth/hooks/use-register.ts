"use client";
import { useMutation } from "@tanstack/react-query";
import { registerUser } from "../api/auth.api";

export function useRegister() {
  return useMutation({
    mutationFn: registerUser,
  });
}