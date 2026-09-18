"use client";

import { useMemo, useState } from "react";
import {
  FiFolder,
  FiHardDrive,
  FiImage,
  FiFileText,
  FiFile,
  FiEdit3,
  FiDatabase,
  FiUploadCloud,
  FiSearch,
  FiX,
  FiRefreshCw,
  FiPlus,
  FiEye,
  FiDownload,
  FiCopy,
  FiTrash2,
  FiAlertTriangle,
  FiShield,
  FiLock,
  FiCheck,
  FiClock,
  FiTrash
} from "react-icons/fi";
import { filesApi } from "../api/files.api";
import {
  useDeleteFile,
  useFiles,
  useUpload,
  useReuseFile,
  useOrphanStats,
  useCleanupOrphans
} from "../hooks/use-files";
import { LmsMarkdownEditor } from "./lms-markdown-editor";
import type { FileRecord } from "../types/file";

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const formatDate = (isoString: string): string => {
  const d = new Date(isoString);
  return d.toLocaleString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
};

const getFileCategory = (mime: string, name: string): "image" | "markdown" | "doc" | "data" | "other" => {
  const lowerName = name.toLowerCase();
  if (mime.startsWith("image/")) return "image";
  if (mime === "text/markdown" || lowerName.endsWith(".md") || lowerName.endsWith(".markdown")) return "markdown";
  if (mime === "application/pdf" || mime === "text/plain" || lowerName.endsWith(".txt") || lowerName.endsWith(".pdf")) return "doc";
  if (mime === "application/json" || mime === "text/csv" || lowerName.endsWith(".json") || lowerName.endsWith(".csv")) return "data";
  return "other";
};

const renderFileIcon = (category: string) => {
  switch (category) {
    case "image":
      return <FiImage size={18} />;
    case "markdown":
      return <FiEdit3 size={18} />;
    case "doc":
      return <FiFileText size={18} />;
    case "data":
      return <FiDatabase size={18} />;
    default:
      return <FiFile size={18} />;
  }
};

const getCategoryLabel = (category: string) => {
  switch (category) {
    case "image":
      return "Hình ảnh";
    case "markdown":
      return "Markdown";
    case "doc":
      return "Tài liệu";
    case "data":
      return "Dữ liệu";
    default:
      return "Tệp tin";
  }
};

type SortOption = "newest" | "oldest" | "name_asc" | "name_desc" | "size_desc" | "size_asc";

export function FileManager() {
  const q = useFiles();
  const up = useUpload();
  const del = useDeleteFile();
  const orphanStats = useOrphanStats();
  const cleanup = useCleanupOrphans();
  const reuse = useReuseFile();

  // Navigation tab state
  const [activeTab, setActiveTab] = useState<"list" | "upload" | "markdown">("list");

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");

  // Drag & drop state
  const [isDragOver, setIsDragOver] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);

  // LMS Editor states
  const [lmsInitialContent, setLmsInitialContent] = useState<string | undefined>(undefined);
  const [lmsInitialTitle, setLmsInitialTitle] = useState<string | undefined>(undefined);

  // Actions states
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals state
  const [previewFile, setPreviewFile] = useState<FileRecord | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewText, setPreviewText] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [deletingFile, setDeletingFile] = useState<FileRecord | null>(null);
  const [reusingFile, setReusingFile] = useState<FileRecord | null>(null);
  const [reuseName, setReuseName] = useState("");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const handleOpenReuse = (f: FileRecord) => {
    const ext = f.extension || "";
    const base = ext && f.name.toLowerCase().endsWith(`.${ext.toLowerCase()}`)
      ? f.name.slice(0, -(ext.length + 1))
      : f.name;
    setReuseName(ext ? `${base} (Bản sao).${ext}` : `${base} (Bản sao)`);
    setReusingFile(f);
  };

  const handleConfirmReuse = () => {
    if (!reusingFile) return;
    reuse.mutate(
      { id: reusingFile.id, newName: reuseName.trim() || undefined },
      {
        onSuccess: (data) => {
          showToast(`Đã nhân bản "${data.name}" thành công (0 byte dung lượng mới)!`);
          setReusingFile(null);
        },
        onError: (err: unknown) => {
          const e = err as { response?: { data?: { error?: { message?: string } } }; message?: string };
          alert(e?.response?.data?.error?.message || e?.message || "Nhân bản tệp thất bại.");
        }
      }
    );
  };

  const handleOpenInLmsEditor = async (f: FileRecord) => {
    try {
      const text = await filesApi.getTextContent(f.id);
      setLmsInitialContent(text);
      setLmsInitialTitle(f.name);
      setActiveTab("markdown");
      showToast(`Đã mở tệp "${f.name}" trong trình soạn bài giảng LMS!`);
    } catch {
      showToast("Không thể tải nội dung tệp tin để mở soạn thảo.");
    }
  };

  const handleRunCleanup = (force = false) => {
    cleanup.mutate(force, {
      onSuccess: (data) => {
        showToast(`Đã dọn dẹp thành công ${data.deleted} tệp mồ côi khỏi bộ nhớ lưu trữ!`);
      },
      onError: (err: unknown) => {
        const e = err as { response?: { data?: { error?: { message?: string } } }; message?: string };
        alert(e?.response?.data?.error?.message || e?.message || "Dọn dẹp tệp mồ côi thất bại.");
      }
    });
  };

  const files = useMemo(() => q.data ?? [], [q.data]);

  // Statistics
  const stats = useMemo(() => {
    const totalCount = files.length;
    const totalBytes = files.reduce((acc, f) => acc + (f.object?.size ?? 0), 0);
    const imageCount = files.filter(f => getFileCategory(f.object?.mimeType ?? "", f.name) === "image").length;
    const docCount = files.filter(f => {
      const cat = getFileCategory(f.object?.mimeType ?? "", f.name);
      return cat === "doc" || cat === "markdown" || cat === "data";
    }).length;

    return {
      totalCount,
      totalBytes: formatSize(totalBytes),
      imageCount,
      docCount
    };
  }, [files]);

  // Filtered and sorted files
  const filteredFiles = useMemo(() => {
    let result = [...files];

    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase().trim();
      result = result.filter(f => f.name.toLowerCase().includes(query));
    }

    if (filterCategory !== "all") {
      result = result.filter(f => getFileCategory(f.object?.mimeType ?? "", f.name) === filterCategory);
    }

    result.sort((a, b) => {
      if (sortBy === "newest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortBy === "name_asc") return a.name.localeCompare(b.name);
      if (sortBy === "name_desc") return b.name.localeCompare(a.name);
      if (sortBy === "size_desc") return (b.object?.size ?? 0) - (a.object?.size ?? 0);
      if (sortBy === "size_asc") return (a.object?.size ?? 0) - (b.object?.size ?? 0);
      return 0;
    });

    return result;
  }, [files, searchTerm, filterCategory, sortBy]);

  const handleFileUpload = (file: File) => {
    setClientError(null);
    if (file.size > 20 * 1024 * 1024) {
      setClientError("Tệp quá lớn! Kích thước tối đa cho phép là 20MB.");
      return;
    }
    up.mutate(file, {
      onSuccess: () => {
        showToast(`Đã tải lên tệp "${file.name}" thành công!`);
        setActiveTab("list");
      }
    });
  };

  const handleDownload = async (id: string, name: string) => {
    try {
      setDownloadingId(id);
      await filesApi.download(id, name);
      showToast(`Tải xuống tệp "${name}" thành công.`);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } }; message?: string };
      alert(e?.response?.data?.error?.message || e?.message || "Không thể tải xuống tệp tin.");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleOpenPreview = async (file: FileRecord) => {
    setPreviewFile(file);
    setPreviewUrl(null);
    setPreviewText(null);
    setPreviewLoading(true);

    const category = getFileCategory(file.object?.mimeType ?? "", file.name);

    try {
      const blob = await filesApi.getBlob(file.id);
      if (category === "image") {
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
      } else if (category === "markdown" || category === "doc" || category === "data") {
        const text = await blob.text();
        setPreviewText(text);
      }
    } catch {
      // If preview fails, info grid will still be visible
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleClosePreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewFile(null);
    setPreviewUrl(null);
    setPreviewText(null);
  };

  const handleConfirmDelete = () => {
    if (!deletingFile) return;
    const fileName = deletingFile.name;
    del.mutate(deletingFile.id, {
      onSuccess: () => {
        showToast(`Đã xóa tệp "${fileName}" thành công.`);
        setDeletingFile(null);
        if (previewFile?.id === deletingFile.id) {
          handleClosePreview();
        }
      },
      onError: (err: unknown) => {
        const e = err as { response?: { data?: { error?: { message?: string } } }; message?: string };
        alert(e?.response?.data?.error?.message || e?.message || "Xóa tệp tin thất bại.");
      }
    });
  };

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    showToast("Đã sao chép mã định danh tệp (ID) vào bộ nhớ tạm!");
  };

  const uploadErrorMessage = clientError || (up.isError
    ? ((up.error as { response?: { data?: { error?: { message?: string } } }; message?: string })?.response?.data?.error?.message
      || (up.error as Error)?.message
      || "Tải tệp lên thất bại.")
    : null);

  return (
    <>
      {/* Toast notification */}
      {toastMessage && (
        <div className="toast">
          <FiCheck size={16} color="var(--success)" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Thống kê tổng quan */}
      <section className="stats">
        <div className="stat">
          <div className="stat-icon">
            <FiFolder size={20} />
          </div>
          <div>
            <strong>{stats.totalCount}</strong>
            <span>Tổng số tệp tin</span>
          </div>
        </div>
        <div className="stat success">
          <div className="stat-icon">
            <FiHardDrive size={20} />
          </div>
          <div>
            <strong>{stats.totalBytes}</strong>
            <span>Dung lượng lưu trữ</span>
          </div>
        </div>
        <div className="stat warn">
          <div className="stat-icon">
            <FiImage size={20} />
          </div>
          <div>
            <strong>{stats.imageCount}</strong>
            <span>Tệp hình ảnh</span>
          </div>
        </div>
        <div className="stat danger">
          <div className="stat-icon">
            <FiFileText size={20} />
          </div>
          <div>
            <strong>{stats.docCount}</strong>
            <span>Tài liệu & Markdown</span>
          </div>
        </div>
      </section>

      {/* Thanh điều hướng tính năng */}
      <div className="file-tabs">
        <button
          type="button"
          className={activeTab === "list" ? "active" : ""}
          onClick={() => setActiveTab("list")}
        >
          <FiFolder size={15} />
          <span>Danh sách tệp tin ({files.length})</span>
        </button>
        <button
          type="button"
          className={activeTab === "upload" ? "active" : ""}
          onClick={() => setActiveTab("upload")}
        >
          <FiUploadCloud size={15} />
          <span>Tải tệp lên</span>
        </button>
        <button
          type="button"
          className={activeTab === "markdown" ? "active" : ""}
          onClick={() => setActiveTab("markdown")}
        >
          <FiEdit3 size={15} />
          <span>Soạn LMS & Chuyển đổi</span>
        </button>
      </div>

      {/* TAB 1: DANH SÁCH TỆP TIN */}
      {activeTab === "list" && (
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Quản lý tệp tin đã lưu</h2>
              <p>Tìm kiếm, xem trước, tải xuống và quản lý an toàn toàn bộ tài liệu lưu trữ.</p>
            </div>
            <div className="head-actions">
              <button
                type="button"
                className="btn secondary sm"
                onClick={() => q.refetch()}
                disabled={q.isFetching}
              >
                <FiRefreshCw size={13} className={q.isFetching ? "spin" : ""} />
                <span>{q.isFetching ? "Đang cập nhật…" : "Làm mới"}</span>
              </button>
              <button
                type="button"
                className="btn sm"
                onClick={() => setActiveTab("upload")}
              >
                <FiPlus size={14} />
                <span>Tải tệp mới</span>
              </button>
            </div>
          </div>

          {/* Thanh tìm kiếm & lọc */}
          <div className="file-toolbar">
            <div className="file-toolbar-filters">
              <div style={{ position: "relative", minWidth: 260, flex: "1 1 260px" }}>
                <input
                  type="text"
                  className="input"
                  placeholder="Tìm kiếm theo tên tệp..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  style={{ paddingLeft: 34 }}
                />
                <span style={{ position: "absolute", left: 11, top: 13, color: "var(--muted)" }}>
                  <FiSearch size={15} />
                </span>
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    style={{ position: "absolute", right: 10, top: 11, border: 0, background: "transparent", color: "var(--muted)", display: "flex" }}
                    aria-label="Xóa từ khóa tìm kiếm"
                  >
                    <FiX size={15} />
                  </button>
                )}
              </div>

              <select
                className="select"
                style={{ width: "auto", minWidth: 160 }}
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
              >
                <option value="all">Tất cả định dạng</option>
                <option value="image">Hình ảnh (PNG, JPG, WebP...)</option>
                <option value="doc">Tài liệu (PDF, TXT)</option>
                <option value="markdown">Markdown (.md)</option>
                <option value="data">Dữ liệu (JSON, CSV)</option>
                <option value="other">Khác</option>
              </select>

              <select
                className="select"
                style={{ width: "auto", minWidth: 160 }}
                value={sortBy}
                onChange={e => setSortBy(e.target.value as SortOption)}
              >
                <option value="newest">Mới nhất trước</option>
                <option value="oldest">Cũ nhất trước</option>
                <option value="name_asc">Tên A → Z</option>
                <option value="name_desc">Tên Z → A</option>
                <option value="size_desc">Dung lượng lớn nhất</option>
                <option value="size_asc">Dung lượng nhỏ nhất</option>
              </select>
            </div>

            <div className="file-toolbar-actions">
              <span style={{ fontSize: 13, color: "var(--muted)" }}>
                Hiển thị <strong>{filteredFiles.length}</strong> / {files.length} tệp
              </span>
            </div>
          </div>

          {/* Bảng danh sách */}
          {q.isLoading ? (
            <div className="loading">Đang tải danh sách tệp tin…</div>
          ) : !files.length ? (
            <div className="empty">
              <div className="empty-icon" style={{ display: "grid", placeItems: "center" }}>
                <FiFolder size={38} color="var(--muted)" />
              </div>
              <h3 style={{ margin: "0 0 6px" }}>Chưa có tệp tin nào</h3>
              <p style={{ margin: "0 0 16px", color: "var(--muted)", fontSize: 13 }}>
                Không gian làm việc của bạn chưa có tài liệu nào được lưu trữ.
              </p>
              <button
                type="button"
                className="btn"
                onClick={() => setActiveTab("upload")}
              >
                <FiUploadCloud size={16} />
                <span>Tải lên tệp đầu tiên</span>
              </button>
            </div>
          ) : !filteredFiles.length ? (
            <div className="empty">
              <div className="empty-icon" style={{ display: "grid", placeItems: "center" }}>
                <FiSearch size={38} color="var(--muted)" />
              </div>
              <h3 style={{ margin: "0 0 6px" }}>Không tìm thấy tệp tin phù hợp</h3>
              <p style={{ margin: "0 0 16px", color: "var(--muted)", fontSize: 13 }}>
                Không có tệp nào khớp với từ khóa tìm kiếm hoặc bộ lọc hiện tại.
              </p>
              <button
                type="button"
                className="btn secondary sm"
                onClick={() => {
                  setSearchTerm("");
                  setFilterCategory("all");
                }}
              >
                Xóa bộ lọc
              </button>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Tên tệp tin</th>
                    <th>Phân loại</th>
                    <th>Dung lượng</th>
                    <th>Ngày tải lên</th>
                    <th style={{ textAlign: "right" }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFiles.map(f => {
                    const category = getFileCategory(f.object?.mimeType ?? "", f.name);
                    const categoryLabel = getCategoryLabel(category);
                    const isImage = category === "image";

                    return (
                      <tr key={f.id}>
                        <td>
                          <div className="person">
                            <div className="file-icon">
                              {renderFileIcon(category)}
                            </div>
                            <div>
                              <strong
                                style={{ cursor: "pointer", color: "var(--brand)" }}
                                onClick={() => handleOpenPreview(f)}
                                title="Nhấp để xem chi tiết và xem trước"
                              >
                                {f.name}
                              </strong>
                              <span style={{ fontSize: 11, color: "var(--muted)", display: "block" }}>
                                ID: {f.id.slice(0, 8)}…
                              </span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${isImage ? "success" : category === "markdown" ? "" : "neutral"}`}>
                            {categoryLabel}
                          </span>
                        </td>
                        <td>{formatSize(f.object?.size ?? 0)}</td>
                        <td>{formatDate(f.createdAt)}</td>
                        <td>
                          <div className="actions">
                            <button
                              type="button"
                              className="btn secondary sm"
                              onClick={() => handleOpenPreview(f)}
                              title="Xem chi tiết & xem trước"
                            >
                              <FiEye size={13} />
                              <span>Xem</span>
                            </button>
                            {category === "markdown" && (
                              <button
                                type="button"
                                className="btn secondary sm"
                                onClick={() => handleOpenInLmsEditor(f)}
                                title="Mở tệp này trong Trình soạn bài giảng LMS"
                              >
                                <FiEdit3 size={13} />
                                <span>Soạn LMS</span>
                              </button>
                            )}
                            <button
                              type="button"
                              className="btn secondary sm"
                              onClick={() => handleOpenReuse(f)}
                              disabled={reuse.isPending}
                              title="Dùng lại / Nhân bản tệp này (Tối ưu 0 byte dung lượng mới)"
                            >
                              <FiCopy size={13} />
                              <span>Dùng lại</span>
                            </button>
                            <button
                              type="button"
                              className="btn secondary sm"
                              disabled={downloadingId === f.id}
                              onClick={() => handleDownload(f.id, f.name)}
                              title="Tải tệp tin về máy"
                            >
                              <FiDownload size={13} />
                              <span>{downloadingId === f.id ? "Đang tải…" : "Tải về"}</span>
                            </button>
                            <button
                              type="button"
                              className="btn danger sm"
                              disabled={del.isPending}
                              onClick={() => setDeletingFile(f)}
                              title="Xóa tệp tin"
                            >
                              <FiTrash2 size={13} />
                              <span>Xóa</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* TAB 2: TẢI LÊN TỆP TIN */}
      {activeTab === "upload" && (
        <div className="grid-2" style={{ alignItems: "start" }}>
          <section className="panel">
            <div className="panel-head">
              <div>
                <h2>Tải lên tệp mới</h2>
                <p>Lưu trữ tệp tin vào bộ nhớ đối tượng an toàn với khả năng tự động chống trùng lặp dữ liệu.</p>
              </div>
            </div>
            <div className="form-panel">
              <div
                className={`dropzone ${isDragOver ? "dragover" : ""}`}
                onDragOver={e => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={e => {
                  e.preventDefault();
                  setIsDragOver(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleFileUpload(file);
                }}
              >
                <input
                  type="file"
                  accept=".md,.markdown,.txt,.pdf,.png,.jpg,.jpeg,.webp,.gif,.svg,.json,.csv"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleFileUpload(file);
                      e.target.value = "";
                    }
                  }}
                />
                <div style={{ display: "grid", placeItems: "center", marginBottom: 12, color: "var(--brand)" }}>
                  <FiUploadCloud size={46} />
                </div>
                <strong>{up.isPending ? "Đang tải lên máy chủ…" : "Kéo và thả tệp vào đây hoặc nhấp để chọn tệp"}</strong>
                <span style={{ display: "block", marginTop: 6 }}>
                  Hỗ trợ: Hình ảnh (PNG, JPG, WebP, SVG, GIF), PDF, Markdown (.md), Văn bản (.txt), JSON, CSV (tối đa 20MB)
                </span>
              </div>

              {up.isSuccess && (
                <p className="success" style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 8 }}>
                  <FiCheck size={16} />
                  <span>Tải tệp lên thành công! Tệp đã được thêm vào hệ thống lưu trữ an toàn.</span>
                </p>
              )}

              {uploadErrorMessage && (
                <p className="error" style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 8 }}>
                  <FiAlertTriangle size={16} />
                  <span>{uploadErrorMessage}</span>
                </p>
              )}
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <div>
                <h2>Quy tắc lưu trữ & bảo mật</h2>
                <p>Thông tin cần biết về hệ thống quản lý tệp tin CoreStack.</p>
              </div>
            </div>
            <div className="form-panel" style={{ fontSize: 13, lineHeight: 1.7, color: "var(--ink)" }}>
              <div className="session-card" style={{ padding: "10px 0" }}>
                <div className="device-icon" style={{ color: "var(--brand)" }}>
                  <FiShield size={20} />
                </div>
                <div className="session-info">
                  <strong>Khử trùng lặp nội dung (Deduplication)</strong>
                  <p>Các tệp có cùng mã băm SHA-256 sẽ dùng chung đối tượng lưu trữ vật lý nhằm tiết kiệm dung lượng.</p>
                </div>
              </div>
              <div className="session-card" style={{ padding: "10px 0" }}>
                <div className="device-icon" style={{ color: "var(--brand)" }}>
                  <FiLock size={20} />
                </div>
                <div className="session-info">
                  <strong>Phân quyền truy cập theo phiên đăng nhập</strong>
                  <p>Mỗi lượt tải xuống đều được kiểm tra quyền sở hữu tệp trước khi cấp luồng dữ liệu an toàn.</p>
                </div>
              </div>
              <div className="session-card" style={{ padding: "14px 0", display: "flex", flexDirection: "column", alignItems: "stretch", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                  <div className="device-icon" style={{ color: "var(--brand)" }}>
                    <FiClock size={20} />
                  </div>
                  <div className="session-info">
                    <strong>Tự động xóa tệp mồ côi trong vòng 10 ngày</strong>
                    <p>
                      Tệp vật lý khi không còn tệp logic nào liên kết (<code>referenceCount = 0</code>) sẽ được giữ lại an toàn trong vòng <strong>10 ngày</strong> (<code>FILE_ORPHAN_RETENTION_DAYS=10</code>).
                    </p>
                    <p style={{ marginTop: 4 }}>
                      Lịch trình hệ thống (Worker) tự động quét và xóa vĩnh viễn tệp mồ côi quá hạn vào lúc <strong>02:00 sáng hàng ngày</strong>.
                    </p>
                  </div>
                </div>

                {/* Trạng thái thực tế từ cơ sở dữ liệu */}
                <div style={{ background: "var(--soft)", padding: "12px 14px", borderRadius: 10, fontSize: 12, border: "1px solid var(--line)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ color: "var(--muted)" }}>Tệp mồ côi đang lưu giữ an toàn (&lt; 10 ngày):</span>
                    <strong>{orphanStats.data?.retainedOrphans ?? 0} tệp</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ color: "var(--muted)" }}>Tệp mồ côi đã quá 10 ngày (đủ điều kiện xóa):</span>
                    <strong style={{ color: (orphanStats.data?.eligibleForCleanup ?? 0) > 0 ? "var(--warning)" : "var(--success)" }}>
                      {orphanStats.data?.eligibleForCleanup ?? 0} tệp
                    </strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--line)", paddingTop: 6 }}>
                    <span style={{ color: "var(--muted)" }}>Tổng số tệp mồ côi hiện tại:</span>
                    <strong>{orphanStats.data?.totalOrphans ?? 0} tệp</strong>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
                  <button
                    type="button"
                    className="btn secondary sm"
                    disabled={cleanup.isPending || orphanStats.isFetching}
                    onClick={() => orphanStats.refetch()}
                    title="Làm mới trạng thái tệp mồ côi"
                  >
                    <FiRefreshCw size={12} className={orphanStats.isFetching ? "spin" : ""} />
                    <span>Làm mới</span>
                  </button>
                  <button
                    type="button"
                    className="btn sm"
                    disabled={cleanup.isPending || (orphanStats.data?.eligibleForCleanup ?? 0) === 0}
                    onClick={() => handleRunCleanup(false)}
                    title="Chỉ xóa các tệp mồ côi đã quá hạn 10 ngày"
                  >
                    <FiTrash2 size={13} />
                    <span>{cleanup.isPending ? "Đang dọn dẹp…" : "Dọn dẹp tệp quá hạn"}</span>
                  </button>
                  <button
                    type="button"
                    className="btn danger sm"
                    disabled={cleanup.isPending || (orphanStats.data?.totalOrphans ?? 0) === 0}
                    onClick={() => {
                      if (confirm("Bạn có chắc chắn muốn dọn dẹp ngay toàn bộ tệp mồ côi mà không chờ đủ 10 ngày?")) {
                        handleRunCleanup(true);
                      }
                    }}
                    title="Xóa ngay tất cả tệp mồ côi (Bỏ qua thời hạn 10 ngày)"
                  >
                    <FiTrash size={13} />
                    <span>Xóa toàn bộ ngay</span>
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* TAB 3: SOẠN BÀI GIẢNG LMS & CHUYỂN ĐỔI ĐA ĐỊNH DẠNG */}
      {activeTab === "markdown" && (
        <div style={{ minHeight: 650 }}>
          <LmsMarkdownEditor
            initialContent={lmsInitialContent}
            initialTitle={lmsInitialTitle}
            onSaved={() => {
              q.refetch();
              showToast("Đã lưu bài giảng vào kho tệp tin!");
            }}
          />
        </div>
      )}

      {/* MODAL: XEM TRƯỚC VÀ CHI TIẾT TỆP TIN */}
      {previewFile && (
        <div className="modal-overlay" onClick={handleClosePreview}>
          <div className="modal-dialog lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Chi tiết tệp tin: {previewFile.name}</h3>
              <button
                type="button"
                className="modal-close"
                onClick={handleClosePreview}
                aria-label="Đóng"
              >
                <FiX size={18} />
              </button>
            </div>

            <div className="modal-body">
              {/* Khu vực xem trước tệp */}
              {previewLoading ? (
                <div className="loading" style={{ padding: "30px 0" }}>
                  Đang tải nội dung xem trước…
                </div>
              ) : previewUrl ? (
                <div className="file-preview-media">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewUrl} alt={previewFile.name} />
                </div>
              ) : previewText !== null ? (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", marginBottom: 6 }}>
                    NỘI DUNG VĂN BẢN (XEM TRƯỚC):
                  </div>
                  <pre className="file-preview-text">{previewText || "(Tệp rỗng)"}</pre>
                </div>
              ) : null}

              {/* Bảng thông số kỹ thuật chi tiết */}
              <div className="file-info-grid">
                <div className="file-info-item">
                  <span>Tên tệp tin</span>
                  <strong>{previewFile.name}</strong>
                </div>
                <div className="file-info-item">
                  <span>Dung lượng</span>
                  <strong>{formatSize(previewFile.object?.size ?? 0)} ({previewFile.object?.size ?? 0} bytes)</strong>
                </div>
                <div className="file-info-item">
                  <span>Định dạng (MIME)</span>
                  <strong>{previewFile.object?.mimeType || "application/octet-stream"}</strong>
                </div>
                <div className="file-info-item">
                  <span>Thời gian tải lên</span>
                  <strong>{formatDate(previewFile.createdAt)}</strong>
                </div>
                <div className="file-info-item" style={{ gridColumn: "1 / -1" }}>
                  <span>Mã định danh (File ID)</span>
                  <strong>{previewFile.id}</strong>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn secondary"
                onClick={() => handleCopyId(previewFile.id)}
              >
                <FiCopy size={14} />
                <span>Sao chép ID</span>
              </button>
              <button
                type="button"
                className="btn"
                disabled={downloadingId === previewFile.id}
                onClick={() => handleDownload(previewFile.id, previewFile.name)}
              >
                <FiDownload size={14} />
                <span>{downloadingId === previewFile.id ? "Đang tải xuống…" : "Tải tệp xuống"}</span>
              </button>
              <button
                type="button"
                className="btn secondary"
                onClick={handleClosePreview}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: XÁC NHẬN XÓA TỆP TIN */}
      {deletingFile && (
        <div className="modal-overlay" onClick={() => setDeletingFile(null)}>
          <div className="modal-dialog" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ color: "var(--danger)", display: "flex", alignItems: "center", gap: 8 }}>
                <FiAlertTriangle size={18} />
                <span>Xác nhận xóa tệp tin</span>
              </h3>
              <button
                type="button"
                className="modal-close"
                onClick={() => setDeletingFile(null)}
                aria-label="Đóng"
              >
                <FiX size={18} />
              </button>
            </div>

            <div className="modal-body">
              <p style={{ margin: "0 0 14px", fontSize: 14, lineHeight: 1.6 }}>
                Bạn có chắc chắn muốn xóa tệp tin <strong>{deletingFile.name}</strong> ({formatSize(deletingFile.object?.size ?? 0)})?
              </p>
              <div className="notice" style={{ margin: 0, background: "#fff0f2", color: "var(--danger)" }}>
                Hành động này sẽ xóa tệp tin khỏi không gian làm việc của bạn và không thể hoàn tác.
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn secondary"
                onClick={() => setDeletingFile(null)}
                disabled={del.isPending}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="btn danger"
                onClick={handleConfirmDelete}
                disabled={del.isPending}
              >
                {del.isPending ? "Đang xóa…" : "Xóa vĩnh viễn"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: TÁI SỬ DỤNG / NHÂN BẢN TỆP TIN */}
      {reusingFile && (
        <div className="modal-overlay" onClick={() => setReusingFile(null)}>
          <div className="modal-dialog" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ color: "var(--brand)", display: "flex", alignItems: "center", gap: 8 }}>
                <FiCopy size={18} />
                <span>Dùng lại / Nhân bản tệp tin</span>
              </h3>
              <button
                type="button"
                className="modal-close"
                onClick={() => setReusingFile(null)}
                aria-label="Đóng"
              >
                <FiX size={18} />
              </button>
            </div>

            <div className="modal-body">
              <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--text)" }}>
                Tệp gốc: <strong>{reusingFile.name}</strong> ({formatSize(reusingFile.object?.size ?? 0)})
              </p>

              <label className="field" style={{ marginBottom: 14 }}>
                <span style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>
                  Tên tệp mới (Bản sao logic):
                </span>
                <input
                  type="text"
                  className="input"
                  value={reuseName}
                  onChange={e => setReuseName(e.target.value)}
                  placeholder="Nhập tên tệp mới..."
                  autoFocus
                />
              </label>

              <div className="notice" style={{ margin: 0, background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0" }}>
                🛡️ <strong>Cơ chế Deduplication thông minh:</strong> Tái sử dụng tệp chỉ tạo một bản ghi logic mới và tăng bộ đếm tham chiếu (<code>referenceCount</code>). <strong>Không tiêu tốn thêm bất kỳ dung lượng đĩa vật lý nào</strong> (0 byte phát sinh).
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn secondary"
                onClick={() => setReusingFile(null)}
                disabled={reuse.isPending}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="btn"
                onClick={handleConfirmReuse}
                disabled={reuse.isPending || !reuseName.trim()}
              >
                <FiCopy size={14} />
                <span>{reuse.isPending ? "Đang xử lý…" : "Xác nhận nhân bản"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
