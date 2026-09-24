import { apiClient } from "@/lib/axios/client";
import { clearAccessToken, setAccessToken } from "@/lib/auth/access-token";
import type { RegisterFormValues } from "../schemas/register.schema";
import type { LoginFormValues } from "../schemas/login.schema";

export type RegisteredUser = {
  id: string;
  email: string;
  displayName: string | null;
  status: "ACTIVE" | "SUSPENDED";
  emailVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type RegisterResponse = {
  success: true;
  data: {
    user: RegisteredUser;
  };
  meta: {
    timestamp: string;
  };
};

type LoginResponse = {
  success: true;
  data: {
    user: RegisteredUser;
    accessToken: string;
    accessTokenExpiresInSeconds: number;
  };
  meta: {
    timestamp: string;
  };
};

type MeResponse = {
  success: true;
  data: {
    user: RegisteredUser;
  };
};


// Gửi dữ liệu đăng ký đã chuẩn hóa tới backend và trả user vừa tạo.
export async function registerUser(values: RegisterFormValues) {
  const displayName = values.displayName.trim();

  const response = await apiClient.post<RegisterResponse>("/auth/register", {
    email: values.email,
    password: values.password,
    ...(displayName ? { displayName } : {}),
  });

  return response.data.data.user;
}

// Đăng nhập, giữ access token trong bộ nhớ và trả user cho AuthContext.
export async function loginUser(values: LoginFormValues) {
  const response = await apiClient.post<LoginResponse>("/auth/login", values);

  setAccessToken(response.data.data.accessToken);

  return response.data.data.user;
}

// Lấy user hiện tại bằng access token mà Axios interceptor tự gắn vào request.
export async function getCurrentUser() {
  const response = await apiClient.get<MeResponse>("/auth/me");
  return response.data.data.user;
}

// Thu hồi session phía backend và luôn xóa access token khỏi bộ nhớ phía frontend.
export async function logoutUser(): Promise<void> {
  try {
    await apiClient.post("/auth/logout");
  } finally {
    clearAccessToken();
  }
}
