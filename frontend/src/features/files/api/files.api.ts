import { api } from "@/lib/axios/client";
import type { FileRecord } from "../types/file";

const form = (file: File) => {
  const x = new FormData();
  x.append("file", file);
  return x;
};

export const filesApi = {
  list: () => api.get("/files").then(r => r.data.data as FileRecord[]),
  upload: (file: File) => api.post("/files/upload", form(file)),
  importMarkdown: (file: File) => api.post("/files/import-markdown", form(file)),
  remove: (id: string) => api.delete(`/files/${id}`),
  exportMarkdown: (name: string, content: string) => api.post("/files/export-markdown", { name, content }),
  reuse: (id: string, newName?: string) => api.post(`/files/${id}/reuse`, { newName }).then(r => r.data.data as FileRecord),
  downloadUrl: (id: string) => `${api.defaults.baseURL}/files/${id}/download`,
  getBlob: async (id: string) => {
    const res = await api.get(`/files/${id}/download`, { responseType: "blob" });
    return new Blob([res.data]);
  },
  getTextContent: async (id: string) => {
    const res = await api.get(`/files/${id}/download`, { responseType: "text" });
    return String(res.data);
  },
  download: async (id: string, fileName: string) => {
    const res = await api.get(`/files/${id}/download`, { responseType: "blob" });
    const blob = new Blob([res.data]);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
  orphanStats: () =>
    api.get("/files/orphans/stats").then(
      r =>
        r.data.data as {
          totalOrphans: number;
          retainedOrphans: number;
          eligibleForCleanup: number;
          retentionDays: number;
          cutoff: string;
        }
    ),
  cleanupOrphans: (force = false) =>
    api.post("/files/orphans/cleanup", { force }).then(
      r =>
        r.data.data as {
          deleted: number;
          retentionDays: number;
          remainingOrphans: number;
          cutoff: string;
        }
    )
};
