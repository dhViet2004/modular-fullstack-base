"use client";

import { useMutation } from "@tanstack/react-query";
import { useAuth } from "../components/auth-provider";
import { loginUser } from "../api/auth.api";

// Đóng gói login mutation và cập nhật AuthContext sau khi đăng nhập thành công.
export function useLogin() {
  const { setAuthenticatedUser } = useAuth();

  return useMutation({
    mutationFn: loginUser,
    onSuccess: setAuthenticatedUser,
  });
}
