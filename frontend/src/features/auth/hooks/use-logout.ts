"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { logoutUser } from "../api/auth.api";
import { useAuth } from "../components/auth-provider";

// Thu hồi session, xóa state/cache nhạy cảm và đưa người dùng về trang đăng nhập.
export function useLogout() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { clearAuthenticatedUser } = useAuth();

  return useMutation({
    mutationFn: logoutUser,
    onSettled: () => {
      clearAuthenticatedUser();
      queryClient.clear();
      router.replace("/login");
    },
  });
}
