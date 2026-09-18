"use client";

import React, { useState } from "react";
import {
  FiEye,
  FiCode,
  FiDownload,
  FiCopy,
  FiCheck,
  FiEdit3,
  FiInfo,
  FiHelpCircle,
  FiAlertCircle,
  FiAlertTriangle,
  FiCheckSquare,
  FiSquare
} from "react-icons/fi";

interface MarkdownPreviewerProps {
  content: string;
  fileName?: string;
  onDownload?: () => void;
  onEditInLms?: () => void;
}

/**
 * Phân tích và định dạng các thành phần văn bản nội dòng (Bold, Italic, Inline Code, Link, Strikethrough)
 */
function renderInlineContent(text: string): React.ReactNode {
  // Biểu thức regex tìm inline code, bold, italic, strikethrough, link
  const tokens: React.ReactNode[] = [];
  let remaining = text;
  let keyIdx = 0;

  while (remaining.length > 0) {
    // 1. Inline code: `code`
    const codeMatch = remaining.match(/^`([^`]+)`/);
    if (codeMatch) {
      tokens.push(
        <code
          key={`code-${keyIdx++}`}
          className="px-1.5 py-0.5 mx-0.5 text-xs font-mono bg-slate-100 text-pink-600 rounded border border-slate-200"
        >
          {codeMatch[1]}
        </code>
      );
      remaining = remaining.slice(codeMatch[0].length);
      continue;
    }

    // 2. Bold: **text** hoặc __text__
    const boldMatch = remaining.match(/^\*\*([^*]+)\*\*/);
    if (boldMatch) {
      tokens.push(
        <strong key={`bold-${keyIdx++}`} className="font-bold text-slate-900">
          {renderInlineContent(boldMatch[1])}
        </strong>
      );
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }

    // 3. Strikethrough: ~~text~~
    const strikeMatch = remaining.match(/^~~([^~]+)~~/);
    if (strikeMatch) {
      tokens.push(
        <span key={`strike-${keyIdx++}`} className="line-through text-slate-400">
          {renderInlineContent(strikeMatch[1])}
        </span>
      );
      remaining = remaining.slice(strikeMatch[0].length);
      continue;
    }

    // 4. Italic: *text* hoặc _text_
    const italicMatch = remaining.match(/^\*([^*]+)\*/);
    if (italicMatch) {
      tokens.push(
        <em key={`italic-${keyIdx++}`} className="italic text-slate-800">
          {renderInlineContent(italicMatch[1])}
        </em>
      );
      remaining = remaining.slice(italicMatch[0].length);
      continue;
    }

    // 5. Link: [label](url)
    const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch) {
      tokens.push(
        <a
          key={`link-${keyIdx++}`}
          href={linkMatch[2]}
          target="_blank"
          rel="noreferrer noopener"
          className="text-indigo-600 hover:text-indigo-800 underline font-medium"
        >
          {linkMatch[1]}
        </a>
      );
      remaining = remaining.slice(linkMatch[0].length);
      continue;
    }

    // Text thông thường
    const nextSpecial = remaining.search(/[`*~[]/);
    if (nextSpecial === -1) {
      tokens.push(remaining);
      break;
    } else if (nextSpecial === 0) {
      tokens.push(remaining[0]);
      remaining = remaining.slice(1);
    } else {
      tokens.push(remaining.slice(0, nextSpecial));
      remaining = remaining.slice(nextSpecial);
    }
  }

  return tokens.length === 1 ? tokens[0] : <>{tokens}</>;
}

/**
 * Trình phân tích cú pháp Markdown sang cây phần tử React đầy đủ
 */
export function parseMarkdownToElements(markdownText: string): React.ReactNode[] {
  const lines = markdownText.split("\n");
  const elements: React.ReactNode[] = [];

  let inCodeBlock = false;
  let codeBlockLang = "";
  let codeBuffer: string[] = [];

  let inTable = false;
  let tableHeaders: string[] = [];
  let tableRows: string[][] = [];

  const flushTable = (key: string) => {
    if (inTable && (tableHeaders.length > 0 || tableRows.length > 0)) {
      elements.push(
        <div key={key} className="my-4 overflow-x-auto rounded-lg border border-slate-200 shadow-2xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200">
                {tableHeaders.map((h, idx) => (
                  <th key={idx} className="p-2.5 font-bold text-slate-800 border-r border-slate-200 last:border-r-0">
                    {renderInlineContent(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row, rIdx) => (
                <tr
                  key={rIdx}
                  className={`border-b border-slate-200 last:border-b-0 ${
                    rIdx % 2 === 0 ? "bg-white" : "bg-slate-50/60"
                  } hover:bg-indigo-50/40 transition-colors`}
                >
                  {row.map((c, cIdx) => (
                    <td key={cIdx} className="p-2.5 text-slate-700 border-r border-slate-200 last:border-r-0">
                      {renderInlineContent(c)}
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

    // 1. Khối mã nguồn (Code blocks ```lang)
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        elements.push(
          <div key={`code-block-${i}`} className="my-3.5 rounded-xl overflow-hidden border border-slate-800 shadow-sm">
            <div className="bg-slate-950 px-3.5 py-1.5 flex items-center justify-between text-[11px] font-mono text-slate-400 border-b border-slate-800 select-none">
              <span className="uppercase font-semibold text-slate-300">{codeBlockLang || "CODE"}</span>
              <span>{codeBuffer.length} lines</span>
            </div>
            <pre className="p-3.5 bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto leading-relaxed m-0">
              <code>{codeBuffer.join("\n")}</code>
            </pre>
          </div>
        );
        codeBuffer = [];
        codeBlockLang = "";
        inCodeBlock = false;
      } else {
        flushTable(`tbl-pre-${i}`);
        inCodeBlock = true;
        codeBlockLang = line.trim().replace(/^```/, "").trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    // 2. Bảng Markdown Table (| col1 | col2 |)
    if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
      const cells = line
        .trim()
        .slice(1, -1)
        .split("|")
        .map((c) => c.trim());
      const isSep = cells.every((c) => /^:?-+:?$/.test(c));

      if (isSep) {
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

    // 3. GitHub Callouts / Alert boxes
    if (line.startsWith("> [!NOTE]")) {
      const body = lines[i + 1]?.startsWith(">") ? lines[i + 1].replace(/^>\s*/, "") : "";
      elements.push(
        <div key={`note-${i}`} className="my-3.5 p-3.5 bg-sky-50 border-l-4 border-sky-500 rounded-r-xl text-xs text-sky-900 flex items-start gap-3 shadow-2xs">
          <FiInfo className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <strong className="font-bold block mb-1 text-sky-950">GHI CHÚ (NOTE)</strong>
            <p className="m-0 leading-relaxed text-sky-900">{renderInlineContent(body)}</p>
          </div>
        </div>
      );
      i++;
      continue;
    }

    if (line.startsWith("> [!TIP]")) {
      const body = lines[i + 1]?.startsWith(">") ? lines[i + 1].replace(/^>\s*/, "") : "";
      elements.push(
        <div key={`tip-${i}`} className="my-3.5 p-3.5 bg-emerald-50 border-l-4 border-emerald-500 rounded-r-xl text-xs text-emerald-900 flex items-start gap-3 shadow-2xs">
          <FiHelpCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <strong className="font-bold block mb-1 text-emerald-950">MẸO HAY (TIP)</strong>
            <p className="m-0 leading-relaxed text-emerald-900">{renderInlineContent(body)}</p>
          </div>
        </div>
      );
      i++;
      continue;
    }

    if (line.startsWith("> [!IMPORTANT]")) {
      const body = lines[i + 1]?.startsWith(">") ? lines[i + 1].replace(/^>\s*/, "") : "";
      elements.push(
        <div key={`imp-${i}`} className="my-3.5 p-3.5 bg-amber-50 border-l-4 border-amber-500 rounded-r-xl text-xs text-amber-900 flex items-start gap-3 shadow-2xs">
          <FiAlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <strong className="font-bold block mb-1 text-amber-950">QUAN TRỌNG (IMPORTANT)</strong>
            <p className="m-0 leading-relaxed text-amber-900">{renderInlineContent(body)}</p>
          </div>
        </div>
      );
      i++;
      continue;
    }

    if (line.startsWith("> [!WARNING]") || line.startsWith("> [!CAUTION]")) {
      const body = lines[i + 1]?.startsWith(">") ? lines[i + 1].replace(/^>\s*/, "") : "";
      elements.push(
        <div key={`warn-${i}`} className="my-3.5 p-3.5 bg-rose-50 border-l-4 border-rose-500 rounded-r-xl text-xs text-rose-900 flex items-start gap-3 shadow-2xs">
          <FiAlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <strong className="font-bold block mb-1 text-rose-950">CẢNH BÁO (WARNING)</strong>
            <p className="m-0 leading-relaxed text-rose-900">{renderInlineContent(body)}</p>
          </div>
        </div>
      );
      i++;
      continue;
    }

    // 4. Blockquote thông thường (> quote)
    if (line.startsWith("> ")) {
      elements.push(
        <blockquote key={`quote-${i}`} className="my-3 pl-4 border-l-3 border-slate-300 text-xs italic text-slate-600">
          {renderInlineContent(line.replace(/^>\s*/, ""))}
        </blockquote>
      );
      continue;
    }

    // 5. Tiêu đề (Headings)
    if (line.startsWith("# ")) {
      elements.push(
        <h1 key={`h1-${i}`} className="text-xl font-bold text-slate-900 mt-6 mb-3 pb-2 border-b border-slate-200">
          {renderInlineContent(line.replace(/^#\s+/, ""))}
        </h1>
      );
      continue;
    }
    if (line.startsWith("## ")) {
      elements.push(
        <h2 key={`h2-${i}`} className="text-base font-bold text-slate-800 mt-5 mb-2.5 flex items-center gap-2">
          <span className="w-1.5 h-4.5 bg-indigo-600 rounded-full inline-block"></span>
          <span>{renderInlineContent(line.replace(/^##\s+/, ""))}</span>
        </h2>
      );
      continue;
    }
    if (line.startsWith("### ")) {
      elements.push(
        <h3 key={`h3-${i}`} className="text-sm font-bold text-slate-800 mt-4 mb-2">
          {renderInlineContent(line.replace(/^###\s+/, ""))}
        </h3>
      );
      continue;
    }
    if (line.startsWith("#### ")) {
      elements.push(
        <h4 key={`h4-${i}`} className="text-xs font-bold text-slate-700 mt-3 mb-1">
          {renderInlineContent(line.replace(/^####\s+/, ""))}
        </h4>
      );
      continue;
    }

    // 6. Đường kẻ ngang (Horizontal Rule)
    if (line.trim() === "---" || line.trim() === "***") {
      elements.push(<hr key={`hr-${i}`} className="my-5 border-t border-slate-200" />);
      continue;
    }

    // 7. Task list (- [ ] hoặc - [x])
    if (/^-\s+\[( |x|X)\]\s/.test(line)) {
      const isChecked = /^-\s+\[(x|X)\]\s/.test(line);
      const text = line.replace(/^-\s+\[( |x|X)\]\s+/, "");
      elements.push(
        <div key={`task-${i}`} className="flex items-center gap-2 text-xs text-slate-700 my-1.5 ml-2">
          {isChecked ? (
            <FiCheckSquare className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <FiSquare className="w-4 h-4 text-slate-400 shrink-0" />
          )}
          <span className={isChecked ? "line-through text-slate-400" : ""}>{renderInlineContent(text)}</span>
        </div>
      );
      continue;
    }

    // 8. Bullet list (- hoặc *)
    if (/^[-*]\s+/.test(line)) {
      elements.push(
        <li key={`li-${i}`} className="ml-5 list-disc text-xs text-slate-700 my-1 leading-relaxed">
          {renderInlineContent(line.replace(/^[-*]\s+/, ""))}
        </li>
      );
      continue;
    }

    // 9. Numbered list (1. 2.)
    if (/^\d+\.\s+/.test(line)) {
      elements.push(
        <li key={`oli-${i}`} className="ml-5 list-decimal text-xs text-slate-700 my-1 leading-relaxed">
          {renderInlineContent(line.replace(/^\d+\.\s+/, ""))}
        </li>
      );
      continue;
    }

    // 10. Đoạn văn thường (Paragraphs)
    if (line.trim().length > 0) {
      elements.push(
        <p key={`p-${i}`} className="my-2.5 text-xs text-slate-700 leading-relaxed">
          {renderInlineContent(line)}
        </p>
      );
    }
  }

  flushTable("tbl-final");
  return elements;
}

/**
 * Component Trình xem trước file .md (Markdown Previewer) cao cấp
 */
export function MarkdownPreviewer({
  content,
  fileName = "document.md",
  onDownload,
  onEditInLms
}: MarkdownPreviewerProps) {
  const [viewMode, setViewMode] = useState<"rendered" | "raw">("rendered");
  const [copied, setCopied] = useState(false);

  // Tải trực tiếp file .md về máy
  const handleDownload = () => {
    if (onDownload) {
      onDownload();
      return;
    }
    const name = fileName.endsWith(".md") ? fileName : `${fileName}.md`;
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Sao chép nội dung Markdown
  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const lineCount = content ? content.split("\n").length : 0;
  const wordCount = content ? content.trim().split(/\s+/).filter(Boolean).length : 0;
  const charCount = content ? content.length : 0;

  return (
    <div className="flex flex-col bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
      {/* Toolbar xem trước */}
      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          {/* Switch tab: Rendered vs Raw */}
          <div className="inline-flex p-1 bg-slate-200/80 rounded-lg text-xs font-medium">
            <button
              type="button"
              onClick={() => setViewMode("rendered")}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md transition-all ${
                viewMode === "rendered"
                  ? "bg-white text-indigo-600 shadow-2xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <FiEye className="w-3.5 h-3.5" />
              <span>Xem trực quan</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("raw")}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md transition-all ${
                viewMode === "raw"
                  ? "bg-white text-indigo-600 shadow-2xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <FiCode className="w-3.5 h-3.5" />
              <span>Mã nguồn (.md)</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-400 hidden sm:flex items-center gap-2 ml-2">
            <span>{lineCount} dòng</span>
            <span>•</span>
            <span>{wordCount} từ</span>
            <span>•</span>
            <span>{charCount} ký tự</span>
          </div>
        </div>

        {/* Nút hành động */}
        <div className="flex items-center gap-1.5">
          {onEditInLms && (
            <button
              type="button"
              onClick={onEditInLms}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors"
              title="Mở tệp này trong Trình soạn bài giảng LMS"
            >
              <FiEdit3 className="w-3.5 h-3.5" />
              <span>Soạn LMS</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors"
            title="Sao chép toàn bộ văn bản Markdown"
          >
            {copied ? <FiCheck className="w-3.5 h-3.5 text-emerald-600" /> : <FiCopy className="w-3.5 h-3.5" />}
            <span>{copied ? "Đã chép" : "Sao chép"}</span>
          </button>

          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-2xs"
            title="Tải tệp .md về máy"
          >
            <FiDownload className="w-3.5 h-3.5" />
            <span>Tải file .md</span>
          </button>
        </div>
      </div>

      {/* Nội dung xem trước */}
      <div className="p-5 max-h-[520px] overflow-y-auto">
        {viewMode === "rendered" ? (
          <div className="lms-preview-content space-y-1">
            {content ? (
              parseMarkdownToElements(content)
            ) : (
              <div className="py-12 text-center text-slate-400 text-xs italic">
                Tệp tin rỗng, chưa có nội dung Markdown.
              </div>
            )}
          </div>
        ) : (
          <pre className="p-4 bg-slate-900 text-slate-100 font-mono text-xs rounded-xl overflow-x-auto leading-relaxed border border-slate-800 m-0 selection:bg-indigo-600/40">
            <code>{content || "(Tệp rỗng)"}</code>
          </pre>
        )}
      </div>
    </div>
  );
}
