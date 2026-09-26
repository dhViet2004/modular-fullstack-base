import { apiClient } from "@/lib/axios/client";

type UploadResponse = { success: true; data: { id: string; size: number } };
export type StoredFile = { id: string; name: string; size: number; updatedAt: string };

export async function listFiles() {
  const response = await apiClient.get<{ success: true; data: StoredFile[] }>("/files");
  return response.data.data;
}

export async function uploadFile(content: string, name: string) {
  const response = await apiClient.post<UploadResponse>("/files", content, {
    headers: { "Content-Type": "application/octet-stream", "X-File-Name": name },
  });
  return response.data.data;
}

export async function updateFile(id: string, content: string, name: string) {
  const response = await apiClient.patch<UploadResponse>(`/files/${id}`, content, { headers: { "Content-Type": "application/octet-stream", "X-File-Name": name } });
  return response.data.data;
}

export async function deleteFile(id: string) {
  await apiClient.delete(`/files/${id}`);
}

export async function downloadFile(id: string) {
  const response = await apiClient.get<Blob>(`/files/${id}`, { responseType: "blob" });
  return response.data;
}
