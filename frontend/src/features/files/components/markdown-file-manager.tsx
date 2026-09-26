"use client";

import { useEffect, useState } from "react";
import { deleteFile, downloadFile, listFiles, updateFile, uploadFile, type StoredFile } from "../api/files.api";
import { useAuth } from "@/features/auth/components/auth-provider";

function previewMarkdown(source: string) {
  const escaped = source.replace(/[&<>]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[character] ?? character);
  return escaped
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/^[-*] (.+)$/gm, "<li>$1</li>")
    .replace(/^(?!<h\d|<li>)(.+)$/gm, "<p>$1</p>")
    .replace(/(<li>.*<\/li>\n?)+/g, (items) => `<ul>${items}</ul>`);
}

export function MarkdownFileManager() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [content, setContent] = useState("# Ghi chú mới\n\n");
  const [name, setName] = useState("note.md");
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [status, setStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthLoading || !user) return;
    void listFiles().then(setFiles).catch(() => setStatus("Không thể tải danh sách file"));
  }, [isAuthLoading, user]);

  if (isAuthLoading) return <p>Đang khôi phục phiên...</p>;

  function importMarkdown(file: File | undefined) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".md")) return setStatus("Chỉ hỗ trợ tệp .md");
    setName(file.name);
    const reader = new FileReader();
    reader.onload = () => setContent(String(reader.result ?? ""));
    reader.readAsText(file);
  }

  async function save() {
    if (!content.trim()) return setStatus("Nội dung không được để trống");
    setIsSaving(true);
    setStatus("Đang tải lên...");
    try {
      const file = currentId ? await updateFile(currentId, content, name) : await uploadFile(content, name);
      setFiles(await listFiles());
      setCurrentId(file.id);
      setStatus(`Đã lưu ${file.size} bytes · ${file.id}`);
    } catch {
      setStatus("Không thể tải tệp lên");
    } finally {
      setIsSaving(false);
    }
  }

  async function exportMarkdown() {
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = name.endsWith(".md") ? name : `${name}.md`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function restore(id: string) {
    setStatus("Đang tải tệp...");
    try {
      setCurrentId(id);
      setContent(await (await downloadFile(id)).text());
      setName(files.find((file) => file.id === id)?.name ?? "note.md");
      setStatus(`Đã mở ${id}`);
    } catch {
      setStatus("Không thể tải tệp");
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Xóa file này?")) return;
    try {
      await deleteFile(id);
      setFiles(await listFiles());
      if (currentId === id) setCurrentId(null);
      setStatus("Đã xóa file");
    } catch {
      setStatus("Không thể xóa file");
    }
  }

  return (
    <section className="w-full max-w-6xl">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p className="font-mono text-xs tracking-[0.14em] text-[var(--signal)]">FILES / MARKDOWN</p><h1 className="mt-3 text-5xl">Kho tệp cá nhân</h1><p className="mt-3 max-w-2xl">Nhập, chỉnh sửa, lưu riêng tư và xuất lại tài liệu Markdown.</p></div><span className="border border-[var(--ink)] px-3 py-2 font-mono text-xs">{files.length} tệp</span></div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(260px,.6fr)]">
      <div className="border border-[var(--ink)] bg-[var(--paper)] p-6 shadow-[8px_8px_0_var(--acid)]">
      <div className="grid gap-4 md:grid-cols-[1fr_auto]"><input value={name} onChange={(event) => setName(event.target.value)} className="border border-[var(--ink)] bg-transparent px-3 py-2" aria-label="Tên tệp" /><label className="cursor-pointer border border-[var(--ink)] px-4 py-2 text-center">Nhập .md<input type="file" accept=".md,text/markdown" className="sr-only" onChange={(event) => importMarkdown(event.target.files?.[0])} /></label></div>
      <div className="mt-4 flex items-center justify-between border border-b-0 border-[var(--ink)] bg-[var(--ink)] px-3 py-2 text-[var(--paper)]"><span className="font-mono text-xs">{isPreviewing ? "REVIEW" : "EDITOR"}</span><button type="button" onClick={() => setIsPreviewing((value) => !value)} aria-label={isPreviewing ? "Quay lại chế độ soạn thảo" : "Xem Markdown dạng review"} className="inline-flex items-center gap-2 border border-[var(--paper)] px-3 py-1 text-xs hover:bg-[var(--paper)] hover:text-[var(--ink)]"><svg aria-hidden="true" viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" /><circle cx="12" cy="12" r="2.5" /></svg>{isPreviewing ? "Soạn thảo" : "Review"}</button></div>
      {isPreviewing ? <article className="prose min-h-96 max-w-none border border-[var(--ink)] bg-white/50 p-6" dangerouslySetInnerHTML={{ __html: previewMarkdown(content) }} /> : <textarea value={content} onChange={(event) => setContent(event.target.value)} className="min-h-96 w-full resize-y border border-[var(--ink)] bg-white/40 p-4 font-mono text-sm leading-6" aria-label="Nội dung Markdown" />}
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" disabled={isSaving} onClick={() => void save()} className="bg-[var(--ink)] px-4 py-2 text-[var(--paper)] disabled:opacity-50">{isSaving ? "Đang lưu..." : "Lưu lên server"}</button>
        <button type="button" onClick={() => void exportMarkdown()} className="border border-[var(--ink)] px-4 py-2">Xuất .md</button>
        <button type="button" onClick={() => { setCurrentId(null); setName("note.md"); setContent("# Ghi chú mới\n\n"); setStatus(""); }} className="border border-[var(--ink)] px-4 py-2">Tệp mới</button>
        {status && <span className="self-center font-mono text-xs">{status}</span>}
      </div>
      </div>
      <aside className="border border-[var(--ink)] bg-[var(--acid)] p-5"><p className="font-mono text-xs tracking-[0.12em]">TỆP ĐÃ LƯU</p>{files.length ? <div className="mt-4 grid gap-2">{files.map((file) => <div key={file.id} className="flex gap-2"><button type="button" onClick={() => void restore(file.id)} className="min-w-0 flex-1 truncate border border-[var(--ink)] bg-[var(--paper)] px-3 py-3 text-left font-mono text-xs hover:bg-white">{file.name}</button><button type="button" onClick={() => void remove(file.id)} className="border border-[var(--ink)] px-2 text-xs" aria-label={`Xóa ${file.name}`}>×</button></div>)}</div> : <p className="mt-4 text-sm">Chưa có bản lưu nào. Lưu tài liệu đầu tiên để thấy nó ở đây.</p>}</aside>
      </div>
    </section>
  );
}
