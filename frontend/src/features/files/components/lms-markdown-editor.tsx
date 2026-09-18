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

  const exportMutation = useExportMarkdown();

  const showNotification = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 4000);
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

          <button
            onClick={handleDownloadMarkdown}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 transition-colors"
            title="Tải tệp .md về máy"
          >
            <FiDownload className="w-4 h-4" />
            <span>Tải .md</span>
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
            {renderMarkdownPreview(content)}
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
                Tạo Bảng Markdown
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

/**
 * Trình dựng hiển thị xem trước bài giảng phong phú (Rich LMS Preview)
 */
function renderMarkdownPreview(markdown: string) {
  const lines = markdown.split(/\r?\n/);
  const elements: React.ReactNode[] = [];

  let inCodeBlock = false;
  let codeBuffer: string[] = [];
  let inTable = false;
  let tableHeaders: string[] = [];
  let tableRows: string[][] = [];

  const flushTable = (key: string) => {
    if (inTable && tableHeaders.length > 0) {
      elements.push(
        <div key={key} className="overflow-x-auto my-4 rounded-lg border border-slate-200 shadow-2xs">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200">
                {tableHeaders.map((h, i) => (
                  <th key={i} className="p-2.5 font-semibold text-slate-800 border-r border-slate-200 last:border-r-0">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row, rIdx) => (
                <tr
                  key={rIdx}
                  className={`border-b border-slate-200 last:border-b-0 ${
                    rIdx % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                  } hover:bg-indigo-50/30 transition-colors`}
                >
                  {row.map((c, cIdx) => (
                    <td key={cIdx} className="p-2.5 text-slate-700 border-r border-slate-200 last:border-r-0">
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      inTable = false;
      tableHeaders = [];
      tableRows = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Xử lý Code block
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        elements.push(
          <pre
            key={`code-${i}`}
            className="my-3 p-3.5 bg-slate-900 text-slate-100 font-mono text-xs rounded-lg overflow-x-auto border border-slate-800"
          >
            <code>{codeBuffer.join("\n")}</code>
          </pre>
        );
        codeBuffer = [];
        inCodeBlock = false;
      } else {
        flushTable(`tbl-pre-${i}`);
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    // Xử lý Table
    if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
      const cells = line
        .trim()
        .slice(1, -1)
        .split("|")
        .map((c) => c.trim());
      const isSep = cells.every((c) => /^:?-+:?$/.test(c));

      if (isSep) {
        // Hàng trước đó là header
        if (!inTable && i > 0) {
          const prev = lines[i - 1].trim();
          if (prev.startsWith("|") && prev.endsWith("|")) {
            tableHeaders = prev
              .slice(1, -1)
              .split("|")
              .map((c) => c.trim());
            inTable = true;
            tableRows = [];
          }
        }
        continue;
      }

      if (inTable) {
        tableRows.push(cells);
        continue;
      }
    } else {
      flushTable(`tbl-${i}`);
    }

    // Xử lý Callout / Alert
    if (line.startsWith("> [!NOTE]")) {
      const noteContent = lines[i + 1]?.startsWith(">") ? lines[i + 1].replace(/^>\s*/, "") : "";
      elements.push(
        <div
          key={`note-${i}`}
          className="my-3 p-3 bg-sky-50 border-l-4 border-sky-500 rounded-r-lg text-xs text-sky-900 flex items-start gap-2.5"
        >
          <FiInfo className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
          <div>
            <strong className="font-semibold block mb-0.5 text-sky-950">Lưu ý giáo án</strong>
            <span>{noteContent}</span>
          </div>
        </div>
      );
      i++; // Skip note body line
      continue;
    }

    if (line.startsWith("> [!TIP]")) {
      const tipContent = lines[i + 1]?.startsWith(">") ? lines[i + 1].replace(/^>\s*/, "") : "";
      elements.push(
        <div
          key={`tip-${i}`}
          className="my-3 p-3 bg-emerald-50 border-l-4 border-emerald-500 rounded-r-lg text-xs text-emerald-900 flex items-start gap-2.5"
        >
          <FiHelpCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <strong className="font-semibold block mb-0.5 text-emerald-950">Mẹo áp dụng</strong>
            <span>{tipContent}</span>
          </div>
        </div>
      );
      i++;
      continue;
    }

    if (line.startsWith("> [!IMPORTANT]")) {
      const impContent = lines[i + 1]?.startsWith(">") ? lines[i + 1].replace(/^>\s*/, "") : "";
      elements.push(
        <div
          key={`imp-${i}`}
          className="my-3 p-3 bg-amber-50 border-l-4 border-amber-500 rounded-r-lg text-xs text-amber-900 flex items-start gap-2.5"
        >
          <FiAlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <strong className="font-semibold block mb-0.5 text-amber-950">Trọng tâm thi cử / Đánh giá</strong>
            <span>{impContent}</span>
          </div>
        </div>
      );
      i++;
      continue;
    }

    // Headers
    if (line.startsWith("# ")) {
      elements.push(
        <h1 key={i} className="text-xl font-bold text-slate-900 mt-6 mb-3 pb-2 border-b border-slate-200">
          {line.replace(/^#\s+/, "")}
        </h1>
      );
      continue;
    }
    if (line.startsWith("## ")) {
      elements.push(
        <h2 key={i} className="text-base font-bold text-slate-800 mt-5 mb-2 flex items-center gap-1.5">
          <span className="w-1.5 h-4 bg-indigo-600 rounded-full inline-block"></span>
          <span>{line.replace(/^##\s+/, "")}</span>
        </h2>
      );
      continue;
    }
    if (line.startsWith("### ")) {
      elements.push(
        <h3 key={i} className="text-sm font-semibold text-slate-700 mt-3 mb-1">
          {line.replace(/^###\s+/, "")}
        </h3>
      );
      continue;
    }

    // Horizontal Rule
    if (line.trim() === "---") {
      elements.push(<hr key={i} className="my-5 border-t border-slate-200" />);
      continue;
    }

    // Bullet lists
    if (line.startsWith("- ")) {
      elements.push(
        <li key={i} className="ml-5 list-disc text-xs text-slate-700 my-1">
          {line.replace(/^- /, "")}
        </li>
      );
      continue;
    }

    // Numbered lists
    if (/^\d+\.\s/.test(line)) {
      elements.push(
        <li key={i} className="ml-5 list-decimal text-xs text-slate-700 my-1">
          {line.replace(/^\d+\.\s/, "")}
        </li>
      );
      continue;
    }

    // Regular paragraphs
    if (line.trim().length > 0) {
      elements.push(
        <p key={i} className="my-2 text-xs text-slate-700 leading-relaxed">
          {line}
        </p>
      );
    }
  }

  flushTable("tbl-final");

  return elements;
}
