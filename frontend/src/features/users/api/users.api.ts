import { apiClient } from "@/lib/axios/client";

export type AdminUser = {
  id: string;
  email: string;
  displayName: string | null;
  status: "ACTIVE" | "SUSPENDED";
  emailVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
  roles: string[];
};

type UsersResponse = {
  success: true;
  data: {
    users: AdminUser[];
  };
};

// Gọi API quản trị; backend yêu cầu permission users:read cho request này.
export async function getUsers(): Promise<AdminUser[]> {
  const response = await apiClient.get<UsersResponse>("/users");
  return response.data.data.users;
}
