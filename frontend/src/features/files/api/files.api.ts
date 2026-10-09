import { apiClient } from "@/lib/axios/client";

type UploadResponse = { success: true; data: { id: string; size: number } };
export type StoredFile = {
  id: string;
  name: string;
  size: number;
  contentType: string;
  updatedAt: string;
};

export async function listFiles(signal?: AbortSignal) {
  const response = await apiClient.get<{ success: true; data: StoredFile[] }>(
    "/files",
    { signal },
  );
  return response.data.data;
}

export async function uploadFile(file: File) {
  validateUpload(file);
  const response = await apiClient.post<UploadResponse>("/files", file, {
    headers: {
      "Content-Type": "application/octet-stream",
      "X-File-Name": file.name,
      "X-File-Content-Type": file.type || "application/octet-stream",
    },
  });
  return response.data.data;
}

export async function updateFile(id: string, file: File) {
  validateUpload(file);
  const response = await apiClient.patch<UploadResponse>(`/files/${id}`, file, {
    headers: {
      "Content-Type": "application/octet-stream",
      "X-File-Name": file.name,
      "X-File-Content-Type": file.type || "application/octet-stream",
    },
  });
  return response.data.data;
}

function validateUpload(file: File) {
  if (file.size === 0) throw new Error("Không thể tải lên tệp rỗng.");
  if (file.size > 5 * 1024 * 1024)
    throw new Error("Tệp vượt quá 5 MiB. Chọn tệp nhỏ hơn.");
}

export async function deleteFile(id: string) {
  await apiClient.delete(`/files/${id}`);
}

export async function downloadFile(id: string) {
  const response = await apiClient.get<Blob>(`/files/${id}`, {
    responseType: "blob",
  });
  return response.data;
}
