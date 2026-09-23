import { apiClient } from "@/lib/axios/client";
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
  };
  meta: {
    timestamp: string;
  };
};


export async function registerUser(values: RegisterFormValues) {
  const displayName = values.displayName.trim();

  const response = await apiClient.post<RegisterResponse>("/auth/register", {
    email: values.email,
    password: values.password,
    ...(displayName ? { displayName } : {}),
  });

  return response.data.data.user;
}

export async function loginUser(values: LoginFormValues) {
  const response = await apiClient.post<LoginResponse>("/auth/login", values);

  return response.data.data.user;
}