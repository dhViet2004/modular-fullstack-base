"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { AuthProvider } from "@/features/auth/components/auth-provider";
import { AuthNavigation } from "@/features/auth/components/auth-navigation";

// Khởi tạo các provider dùng chung một lần cho toàn bộ frontend application.
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthNavigation />
        {children}
      </AuthProvider>
    </QueryClientProvider>
  );
}
