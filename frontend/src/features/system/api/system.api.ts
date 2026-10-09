import { apiClient } from "@/lib/axios/client";
import axios from "axios";

type HealthResponse = {
  success: true;
  data: { status: string; service: string };
};

export async function getApiHealth() {
  const origin = process.env.NEXT_PUBLIC_API_ORIGIN ?? "http://localhost:4000";
  const response = await axios.get<HealthResponse>(`${origin}/health`, {
    timeout: 4_000,
  });
  return response.data.data;
}

export async function getEmailVerificationSetting(signal?: AbortSignal) {
  const response = await apiClient.get<{ data: { enabled: boolean } }>(
    "/system/email-verification",
    { signal },
  );
  return response.data.data.enabled;
}

export async function setEmailVerificationSetting(
  enabled: boolean,
  signal?: AbortSignal,
) {
  const response = await apiClient.patch<{ data: { enabled: boolean } }>(
    "/system/email-verification",
    { enabled },
    { signal },
  );
  return response.data.data.enabled;
}
