"use client";

import React, { useState, useRef } from "react";
import {
  FiFileText,
  FiSave,
  FiCopy,
  FiCheck,
  FiDownload,
  FiTable,
  FiCode,
  FiAlertCircle,
  FiHelpCircle,
  FiInfo,
  FiUploadCloud,
  FiGrid,
  FiRefreshCw
} from "react-icons/fi";
import {
  rawTableDataToMarkdown,
  excelBufferToMarkdown,
  extractTablesFromMarkdown,
  exportTablesToSpreadsheet,
  htmlToLmsMarkdown,
  copyToGoogleDocsClipboard
} from "../utils/markdown-converter";
import { useExportMarkdown } from "../hooks/use-files";
import { parseMarkdownToElements } from "./markdown-previewer";

interface LmsMarkdownEditorProps {
  initialContent?: string;
  initialTitle?: string;
  onSaved?: () => void;
}

const DEFAULT_LMS_TEMPLATE = `# BÀI GIẢNG: NHẬP MÔN THIẾT KẾ HỆ THỐNG FULLSTACK

> [!NOTE]
> Khóa học dành cho kỹ sư phát triển phần mềm muốn làm chủ kiến trúc modular hiện đại.

## 1. Mục tiêu bài học
- Nắm vững kiến trúc Client - Server phân tách độc lập.
- Làm chủ cơ chế Content Hash Deduplication và quản lý tệp tin.
- Thực hành chuyển đổi dữ liệu bài giảng đa nền tảng (Excel, Google Sheets, Google Docs).

---

## 2. Bảng đối chiếu các thành phần hệ thống

| Thành phần | Công nghệ chính | Vai trò | Ghi chú |
| --- | --- | --- | --- |
| Frontend | Next.js 15, React 19, Tailwind | Giao diện người dùng & Trình soạn thảo LMS | Tương thích Rich Text |
| Backend | Node.js, Express 5, Prisma | Xử lý nghiệp vụ & Quản lý tệp tin | REST API bảo mật |
| Lưu trữ (Storage) | Local / Cloudflare R2 | Lưu trữ tệp tin nhị phân | Tự động deduplicate |
| Hàng đợi (Queue) | pg-boss Worker | Tác vụ nền & Dọn dẹp tệp mồ côi | Lập lịch tự động |

---

## 3. Quy trình thực hiện chuẩn

1. Khởi động môi trường Database với Docker Compose.
2. Đồng bộ hóa cấu hình định dạng văn bản Markdown.
3. Xuất báo cáo dữ liệu sang định dạng bảng tính Excel.

> [!TIP]
> Bạn có thể sao chép nhanh bài giảng này sang Google Docs bằng nút "Sao chép cho Google Docs" ở thanh công cụ phía trên!

> [!IMPORTANT]
> Toàn bộ tệp tin trùng mã băm SHA-256 sẽ được hệ thống tái sử dụng tự động để tối ưu dung lượng đĩa vật lý.

\`\`\`typescript
// Đoạn mã kiểm tra hash deduplication
async function verifyContentHash(content: string): Promise<string> {
  const hash = crypto.createHash("sha256").update(content).digest("hex");
  console.log("SHA-256 Hash:", hash);
  return hash;
}
\`\`\`
`;

export function LmsMarkdownEditor({
  initialContent = DEFAULT_LMS_TEMPLATE,
  initialTitle = "bai-giang-chuyen-de.md",
  onSaved
}: LmsMarkdownEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [docTitle, setDocTitle] = useState(initialTitle);
  const [copiedDocs, setCopiedDocs] = useState(false);
  const [activeModal, setActiveModal] = useState<"sheets" | "gdocs" | null>(null);
  const [pasteInput, setPasteInput] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const excelFileInputRef = useRef<HTMLInputElement>(null);
  const mdFileInputRef = useRef<HTMLInputElement>(null);

  const exportMutation = useExportMarkdown();

  const showNotification = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 4000);
  };

  // Tải file .md từ máy tính lên trình soạn thảo
  const handleMdFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      setContent(text);
      setDocTitle(file.name);
      showNotification(`Đã tải lên và nạp nội dung từ tệp "${file.name}" thành công!`);
    } catch {
      showNotification("Không thể đọc tệp .md. Vui lòng kiểm tra định dạng tệp!");
    } finally {
      if (mdFileInputRef.current) mdFileInputRef.current.value = "";
    }
  };

  // Chèn text tại vị trí con trỏ trong textarea
  const insertSnippet = (snippet: string) => {
    const el = textareaRef.current;
    if (!el) {
      setContent((prev) => prev + "\n" + snippet);
      return;
    }

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const before = content.substring(0, start);
    const after = content.substring(end);

    const updated = before + snippet + after;
    setContent(updated);

    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + snippet.length, start + snippet.length);
    }, 50);
  };

  // Lưu bài giảng vào kho tệp hệ thống
  const handleSaveToFiles = async () => {
    const name = docTitle.endsWith(".md") ? docTitle : `${docTitle}.md`;
    try {
      await exportMutation.mutateAsync({ name, content });
      showNotification(`Đã lưu bài giảng "${name}" vào kho tệp CoreStack thành công!`);
      if (onSaved) onSaved();
    } catch {
      showNotification("Lỗi khi lưu bài giảng vào kho tệp. Vui lòng thử lại!");
    }
  };

  // Tải file .md về máy
  const handleDownloadMarkdown = () => {
    const name = docTitle.endsWith(".md") ? docTitle : `${docTitle}.md`;
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
    showNotification(`Đã tải file "${name}" về máy.`);
  };

  // Sao chép cho Google Docs
  const handleCopyForGoogleDocs = async () => {
    const ok = await copyToGoogleDocsClipboard(content);
    setCopiedDocs(true);
    setTimeout(() => setCopiedDocs(false), 3000);
    if (ok) {
      showNotification("Đã sao chép định dạng Rich Text! Hãy mở Google Docs và bấm Ctrl + V.");
    } else {
      showNotification("Đã sao chép nội dung văn bản vào khay nhớ tạm!");
    }
  };

  // Xuất bảng Markdown sang Excel (.xlsx) hoặc CSV
  const handleExportSpreadsheet = (format: "xlsx" | "csv") => {
    try {
      const tables = extractTablesFromMarkdown(content);
      if (tables.length === 0) {
        showNotification("Không tìm thấy bảng dữ liệu nào trong văn bản để xuất!");
        return;
      }
      const baseName = docTitle.replace(/\.md$/i, "");
      exportTablesToSpreadsheet(tables, format, `${baseName}-bang-bieu`);
      showNotification(`Đã trích xuất ${tables.length} bảng dữ liệu sang file .${format} thành công!`);
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "Lỗi khi xuất bảng dữ liệu!");
    }
  };

  // Nhập từ file Excel/CSV (.xlsx, .xls, .csv)
  const handleExcelFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const results = excelBufferToMarkdown(buffer);

      if (results.length === 0) {
        showNotification("Không tìm thấy dữ liệu bảng hợp lệ trong tệp Excel!");
        return;
      }

      let insertedText = `\n\n### Dữ liệu nhập từ: ${file.name}\n\n`;
      results.forEach((res) => {
        insertedText += `**Trang tính: ${res.sheetName}**\n\n${res.markdown}\n\n`;
      });

      insertSnippet(insertedText);
      showNotification(`Đã chuyển đổi thành công ${results.length} trang tính sang bảng Markdown!`);
    } catch {
      showNotification("Không thể đọc tệp Excel/CSV. Vui lòng kiểm tra định dạng!");
    } finally {
      if (excelFileInputRef.current) excelFileInputRef.current.value = "";
    }
  };

  // Dán dữ liệu từ Google Sheets
  const handleApplyGoogleSheetsPaste = () => {
    if (!pasteInput.trim()) return;
    const mdTable = rawTableDataToMarkdown(pasteInput);
    if (!mdTable) {
      showNotification("Dữ liệu bảng dán vào không hợp lệ!");
      return;
    }
    insertSnippet(`\n\n${mdTable}\n\n`);
    setPasteInput("");
    setActiveModal(null);
    showNotification("Đã chèn bảng từ Google Sheets vào bài giảng!");
  };

  // Dán nội dung từ Google Docs
  const handleApplyGoogleDocsPaste = () => {
    if (!pasteInput.trim()) return;
    const md = htmlToLmsMarkdown(pasteInput);
    insertSnippet(`\n\n${md}\n\n`);
    setPasteInput("");
    setActiveModal(null);
    showNotification("Đã chuyển đổi nội dung từ Google Docs sang Markdown thành công!");
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Header & Tiêu đề bài giảng */}
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-[280px] flex-1">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
            <FiFileText className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <input
              type="text"
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              placeholder="Tên bài giảng (vd: bai-giang-so-1.md)"
              className="font-semibold text-slate-800 bg-transparent hover:bg-white focus:bg-white px-2 py-1 rounded border border-transparent focus:border-indigo-400 focus:outline-hidden text-sm w-full transition-all"
            />
            <p className="text-xs text-slate-500 px-2">Định dạng: Chuẩn Markdown LMS (.md) • Tự động hóa bảng & tài liệu</p>
          </div>
        </div>

        {/* Nút hành động chính */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleCopyForGoogleDocs}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
              copiedDocs
                ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-indigo-600"
            }`}
            title="Chuyển đổi bài giảng sang Rich Text để dán trực tiếp vào Google Docs"
          >
            {copiedDocs ? <FiCheck className="w-4 h-4 text-emerald-600" /> : <FiCopy className="w-4 h-4" />}
            <span>{copiedDocs ? "Đã sao chép!" : "Sao chép cho Google Docs"}</span>
          </button>

          <label
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hover:text-indigo-600 cursor-pointer transition-colors"
            title="Tải tệp .md từ máy tính vào trình soạn thảo"
          >
            <FiUploadCloud className="w-4 h-4 text-indigo-600" />
            <span>Tải .md lên</span>
            <input
              ref={mdFileInputRef}
              type="file"
              accept=".md,.markdown,text/markdown,text/plain"
              onChange={handleMdFileUpload}
              className="hidden"
            />
          </label>

          <button
            onClick={handleDownloadMarkdown}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 transition-colors"
            title="Tải tệp .md về máy"
          >
            <FiDownload className="w-4 h-4" />
            <span>Tải .md về</span>
          </button>

          <button
            onClick={handleSaveToFiles}
            disabled={exportMutation.isPending}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-xs disabled:opacity-50"
          >
            <FiSave className="w-4 h-4" />
            <span>{exportMutation.isPending ? "Đang lưu..." : "Lưu vào kho tệp"}</span>
          </button>
        </div>
      </div>

      {/* Thông báo trạng thái */}
      {statusMessage && (
        <div className="bg-indigo-50 border-b border-indigo-100 px-4 py-2 text-xs font-medium text-indigo-700 flex items-center justify-between animate-fadeIn">
          <span>{statusMessage}</span>
          <button onClick={() => setStatusMessage(null)} className="text-indigo-400 hover:text-indigo-600">
            ×
          </button>
        </div>
      )}

      {/* Thanh công cụ giáo án & chuyển đổi */}
      <div className="bg-white border-b border-slate-200 px-3 py-2 flex flex-wrap items-center gap-1 text-xs select-none">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1">Giáo án:</span>
        <button
          onClick={() => insertSnippet("\n# Tiêu đề chương\n")}
          className="px-2 py-1 rounded bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold border border-slate-200"
          title="Tiêu đề chương lớn (H1)"
        >
          H1
        </button>
        <button
          onClick={() => insertSnippet("\n## Mục bài học\n")}
          className="px-2 py-1 rounded bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold border border-slate-200"
          title="Mục bài học (H2)"
        >
          H2
        </button>
        <button
          onClick={() => insertSnippet("\n### Điểm kiến thức nhỏ\n")}
          className="px-2 py-1 rounded bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold border border-slate-200"
          title="Điểm kiến thức nhỏ (H3)"
        >
          H3
        </button>

        <div className="h-4 w-px bg-slate-200 mx-1" />

        {/* Hộp Callout bài giảng */}
        <button
          onClick={() => insertSnippet("\n> [!NOTE]\n> Lưu ý quan trọng cho học viên: \n")}
          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200"
          title="Hộp ghi chú bài học"
        >
          <FiInfo className="w-3.5 h-3.5" />
          <span>Lưu ý</span>
        </button>
        <button
          onClick={() => insertSnippet("\n> [!TIP]\n> Mẹo áp dụng thực tế: \n")}
          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
          title="Hộp mẹo hay"
        >
          <FiHelpCircle className="w-3.5 h-3.5" />
          <span>Mẹo</span>
        </button>
        <button
          onClick={() => insertSnippet("\n> [!IMPORTANT]\n> Điểm thi cần chú ý: \n")}
          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
          title="Điểm kiến thức trọng tâm"
        >
          <FiAlertCircle className="w-3.5 h-3.5" />
          <span>Trọng tâm</span>
        </button>

        <button
          onClick={() =>
            insertSnippet(
              "\n| Cột 1 | Cột 2 | Cột 3 |\n| --- | --- | --- |\n| Dữ liệu A | Dữ liệu B | Dữ liệu C |\n"
            )
          }
          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200"
          title="Chèn bảng Markdown mẫu"
        >
          <FiTable className="w-3.5 h-3.5" />
          <span>Chèn Bảng</span>
        </button>

        <button
          onClick={() => insertSnippet("\n```typescript\n// Mã nguồn minh họa\n\n```\n")}
          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200"
          title="Chèn khối mã nguồn"
        >
          <FiCode className="w-3.5 h-3.5" />
          <span>Khối Code</span>
        </button>

        <div className="h-4 w-px bg-slate-200 mx-1" />

        {/* Chuyển đổi hai chiều */}
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1">Chuyển đổi:</span>

        {/* Nhập từ file Excel/CSV */}
        <label className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 cursor-pointer">
          <FiUploadCloud className="w-3.5 h-3.5" />
          <span>Nhập Excel/CSV</span>
          <input
            ref={excelFileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleExcelFileUpload}
            className="hidden"
          />
        </label>

        {/* Nhập từ Google Sheets */}
        <button
          onClick={() => {
            setPasteInput("");
            setActiveModal("sheets");
          }}
          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
          title="Dán dữ liệu sao chép từ Google Sheets thành bảng Markdown"
        >
          <FiGrid className="w-3.5 h-3.5" />
          <span>Từ Google Sheets</span>
        </button>

        {/* Nhập từ Google Docs */}
        <button
          onClick={() => {
            setPasteInput("");
            setActiveModal("gdocs");
          }}
          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
          title="Dán văn bản phong phú / HTML từ Google Docs để chuyển sang Markdown"
        >
          <FiFileText className="w-3.5 h-3.5" />
          <span>Từ Google Docs</span>
        </button>

        <div className="h-4 w-px bg-slate-200 mx-1" />

        {/* Xuất bảng sang Excel/CSV */}
        <button
          onClick={() => handleExportSpreadsheet("xlsx")}
          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200"
          title="Xuất tất cả bảng trong bài giảng thành tệp Excel .xlsx"
        >
          <FiDownload className="w-3.5 h-3.5" />
          <span>Xuất Bảng Excel</span>
        </button>

        <button
          onClick={() => handleExportSpreadsheet("csv")}
          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200"
          title="Xuất bảng thành tệp .csv"
        >
          <FiDownload className="w-3.5 h-3.5" />
          <span>Xuất CSV</span>
        </button>

        <button
          onClick={() => setContent(DEFAULT_LMS_TEMPLATE)}
          className="ml-auto inline-flex items-center gap-1 px-2 py-1 rounded text-slate-500 hover:text-slate-700 hover:bg-slate-100"
          title="Khôi phục bài giảng mẫu"
        >
          <FiRefreshCw className="w-3.5 h-3.5" />
          <span>Mẫu gốc</span>
        </button>
      </div>

      {/* Editor & Live Preview Split Screen */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200 min-h-[460px] overflow-hidden">
        {/* Cột trái: Markdown Source Code */}
        <div className="flex flex-col h-full bg-slate-900 text-slate-100">
          <div className="px-3 py-1.5 bg-slate-950/60 border-b border-slate-800 text-[11px] font-semibold text-slate-400 flex items-center justify-between">
            <span>MÃ NGUỒN MARKDOWN</span>
            <span>{content.length} ký tự</span>
          </div>
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Viết nội dung bài giảng tại đây theo cú pháp Markdown..."
            className="flex-1 p-4 bg-transparent text-slate-100 font-mono text-xs leading-relaxed resize-none focus:outline-hidden selection:bg-indigo-600/40"
            spellCheck={false}
          />
        </div>

        {/* Cột phải: Live LMS Lecture Preview */}
        <div className="flex flex-col h-full bg-white overflow-hidden">
          <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 flex items-center justify-between">
            <span>XEM TRƯỚC BÀI GIẢNG (LMS LIVE PREVIEW)</span>
            <span className="text-emerald-600 font-medium">Trực quan hóa</span>
          </div>
          <div className="flex-1 p-6 overflow-y-auto lms-preview prose prose-slate max-w-none text-sm leading-relaxed">
            {parseMarkdownToElements(content)}
          </div>
        </div>
      </div>

      {/* Modal dán Google Sheets */}
      {activeModal === "sheets" && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-5 border border-slate-200 animate-fadeIn">
            <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2 mb-2">
              <FiGrid className="w-5 h-5 text-emerald-600" />
              <span>Chuyển đổi dữ liệu từ Google Sheets</span>
            </h3>
            <p className="text-xs text-slate-600 mb-3">
              Mở Google Sheets, bôi đen vùng bảng dữ liệu bạn muốn dùng, bấm <strong>Ctrl + C</strong> rồi dán vào khung
              dưới đây:
            </p>
            <textarea
              value={pasteInput}
              onChange={(e) => setPasteInput(e.target.value)}
              placeholder="Dán dữ liệu bảng từ Google Sheets vào đây..."
              rows={6}
              className="w-full p-2.5 text-xs font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 mb-3"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setActiveModal(null)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Hủy
              </button>
              <button
                onClick={handleApplyGoogleSheetsPaste}
                disabled={!pasteInput.trim()}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-50"
              >
                Chuyển thành Bảng Markdown
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal dán Google Docs */}
      {activeModal === "gdocs" && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-5 border border-slate-200 animate-fadeIn">
            <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2 mb-2">
              <FiFileText className="w-5 h-5 text-blue-600" />
              <span>Chuyển đổi văn bản từ Google Docs / HTML</span>
            </h3>
            <p className="text-xs text-slate-600 mb-3">
              Mở Google Docs, sao chép nội dung bài giảng hoặc mã HTML dán vào khung dưới đây để tự động tạo Markdown chuẩn:
            </p>
            <textarea
              value={pasteInput}
              onChange={(e) => setPasteInput(e.target.value)}
              placeholder="Dán nội dung từ Google Docs hoặc mã HTML vào đây..."
              rows={6}
              className="w-full p-2.5 text-xs font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-3"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setActiveModal(null)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Hủy
              </button>
              <button
                onClick={handleApplyGoogleDocsPaste}
                disabled={!pasteInput.trim()}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
              >
                Chuyển sang Markdown
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
