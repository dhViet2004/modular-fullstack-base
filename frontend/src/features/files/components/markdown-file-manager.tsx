"use client";

import { useEffect, useState } from "react";
import { deleteFile, downloadFile, listFiles, uploadFile, type StoredFile } from "../api/files.api";
import { useAuth } from "@/features/auth/components/auth-provider";

export function MarkdownFileManager() {
  const { user, isLoading } = useAuth();
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [status, setStatus] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!isLoading && user) void listFiles().then(setFiles).catch(() => setStatus("Không thể tải danh sách tệp"));
  }, [isLoading, user]);

  async function upload(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setStatus("Đang tải lên...");
    try {
      await uploadFile(file);
      setFiles(await listFiles());
      setStatus(`Đã lưu ${file.name}`);
    } catch {
      setStatus("Không thể tải tệp lên (tối đa 5 MiB mỗi tệp, 10 tệp mỗi tài khoản)");
    } finally {
      setUploading(false);
    }
  }

  async function download(file: StoredFile) {
    try {
      const url = URL.createObjectURL(await downloadFile(file.id));
      const link = document.createElement("a");
      link.href = url;
      link.download = file.name;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      setStatus("Không thể tải tệp xuống");
    }
  }

  async function remove(file: StoredFile) {
    if (!window.confirm(`Xóa ${file.name}?`)) return;
    try {
      await deleteFile(file.id);
      setFiles(await listFiles());
      setStatus(`Đã xóa ${file.name}`);
    } catch {
      setStatus("Không thể xóa tệp");
    }
  }

  if (isLoading) return <p>Đang khôi phục phiên...</p>;
  return <section className="w-full max-w-4xl">
    <header className="mb-8"><p className="font-mono text-xs tracking-[0.14em] text-[var(--signal)]">TỆP / LƯU TRỮ</p><h1 className="mt-3 text-5xl">Kho tệp cá nhân</h1><p className="mt-3">Lưu và tải xuống mọi định dạng tệp, tối đa 5 MiB mỗi tệp và 10 tệp mỗi tài khoản.</p></header>
    <label className="inline-block cursor-pointer border border-[var(--ink)] bg-[var(--acid)] px-5 py-3 font-mono text-sm">{uploading ? "Đang tải lên..." : "Chọn tệp để tải lên"}<input type="file" className="sr-only" disabled={uploading} onChange={(event) => { void upload(event.target.files?.[0]); event.target.value = ""; }} /></label>
    {status && <p role="status" className="mt-4 font-mono text-sm">{status}</p>}
    <div className="mt-8 border border-[var(--ink)] bg-[var(--paper)] p-5 shadow-[8px_8px_0_var(--acid)]"><h2 className="font-mono text-sm">TỆP ĐÃ LƯU / {files.length}</h2>
      {files.length ? <ul className="mt-4 space-y-2">{files.map((file) => <li key={file.id} className="flex items-center gap-3 border border-[var(--ink)] p-3"><span className="min-w-0 flex-1 truncate font-mono text-sm">{file.name} - {file.size} byte</span><button type="button" onClick={() => void download(file)} className="underline">Tải xuống</button><button type="button" onClick={() => void remove(file)} className="underline">Xóa</button></li>)}</ul> : <p className="mt-4">Chưa có tệp nào.</p>}
    </div>
  </section>;
}
