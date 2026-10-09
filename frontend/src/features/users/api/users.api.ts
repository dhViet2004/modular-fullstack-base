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
export async function getUsers(signal?: AbortSignal): Promise<AdminUser[]> {
  const response = await apiClient.get<UsersResponse>("/users", { signal });
  return response.data.data.users;
}

export async function setAdminRole(
  userId: string,
  enabled: boolean,
  signal?: AbortSignal,
) {
  await apiClient.patch(
    `/users/${userId}/roles/admin`,
    { enabled },
    { signal },
  );
}
