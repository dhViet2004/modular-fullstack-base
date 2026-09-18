import * as XLSX from "xlsx";

export interface ParsedTable {
  headers: string[];
  rows: string[][];
}

/**
 * Phân tích chuỗi dữ liệu bảng (TSV/CSV sao chép từ Google Sheets/Excel hoặc từ file CSV)
 * thành Markdown Table chuẩn.
 */
export function rawTableDataToMarkdown(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";

  // Tách dòng
  const lines = trimmed.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return "";

  // Nhận diện dấu phân cách: tab (\t), comma (,), semicolon (;)
  const firstLine = lines[0];
  let delimiter = "\t";
  if (firstLine.includes("\t")) {
    delimiter = "\t";
  } else if (firstLine.includes(",")) {
    delimiter = ",";
  } else if (firstLine.includes(";")) {
    delimiter = ";";
  }

  const matrix = lines.map((line) => {
    // Tách cột đơn giản theo delimiter
    return line.split(delimiter).map((c) => c.replace(/^["']|["']$/g, "").trim());
  });

  const colCount = Math.max(...matrix.map((r) => r.length));
  if (colCount === 0) return "";

  // Hàng 1 là Header
  const headers = matrix[0];
  while (headers.length < colCount) headers.push(`Cột ${headers.length + 1}`);

  const headerRow = `| ${headers.map((h) => h || "-").join(" | ")} |`;
  const separatorRow = `| ${headers.map(() => "---").join(" | ")} |`;

  const bodyRows = matrix.slice(1).map((row) => {
    const padded = [...row];
    while (padded.length < colCount) padded.push("");
    return `| ${padded.map((c) => c.replace(/\|/g, "\\|") || " ").join(" | ")} |`;
  });

  return [headerRow, separatorRow, ...bodyRows].join("\n");
}

/**
 * Đọc file Excel (.xlsx, .xls) hoặc CSV dưới dạng ArrayBuffer và chuyển sang Markdown Table
 */
export function excelBufferToMarkdown(buffer: ArrayBuffer): { sheetName: string; markdown: string }[] {
  const workbook = XLSX.read(buffer, { type: "array" });
  const results: { sheetName: string; markdown: string }[] = [];

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    // Chuyển sang mảng 2 chiều
    const rawData = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1, defval: "" });

    if (!rawData || rawData.length === 0) continue;

    // Lọc các dòng trống
    const rows = rawData.filter((r) => r.some((c) => String(c).trim().length > 0));
    if (rows.length === 0) continue;

    const colCount = Math.max(...rows.map((r) => r.length));
    const headers = rows[0].map((h, i) => String(h || `Cột ${i + 1}`).trim());
    while (headers.length < colCount) headers.push(`Cột ${headers.length + 1}`);

    const headerRow = `| ${headers.join(" | ")} |`;
    const separatorRow = `| ${headers.map(() => "---").join(" | ")} |`;

    const dataRows = rows.slice(1).map((r) => {
      const padded = [...r];
      while (padded.length < colCount) padded.push("");
      return `| ${padded.map((c) => String(c).replace(/\|/g, "\\|").trim() || " ").join(" | ")} |`;
    });

    const markdown = [headerRow, separatorRow, ...dataRows].join("\n");
    results.push({ sheetName, markdown });
  }

  return results;
}

/**
 * Trích xuất tất cả các bảng Markdown từ chuỗi văn bản Markdown
 */
export function extractTablesFromMarkdown(markdown: string): ParsedTable[] {
  const tables: ParsedTable[] = [];
  const lines = markdown.split(/\r?\n/);

  let currentHeaders: string[] | null = null;
  let currentRows: string[][] = [];
  let inTable = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith("|") && line.endsWith("|")) {
      const cells = line
        .slice(1, -1)
        .split("|")
        .map((c) => c.trim());

      // Kiểm tra có phải dòng phân cách |---|---| không
      const isSeparator = cells.every((c) => /^:?-+:?$/.test(c));

      if (isSeparator && !inTable && i > 0) {
        // Dòng trước đó là Header
        const prevLine = lines[i - 1].trim();
        if (prevLine.startsWith("|") && prevLine.endsWith("|")) {
          currentHeaders = prevLine
            .slice(1, -1)
            .split("|")
            .map((c) => c.trim());
          inTable = true;
          currentRows = [];
          continue;
        }
      }

      if (inTable && !isSeparator) {
        currentRows.push(cells);
      }
    } else {
      if (inTable && currentHeaders) {
        tables.push({ headers: currentHeaders, rows: currentRows });
        currentHeaders = null;
        currentRows = [];
        inTable = false;
      }
    }
  }

  if (inTable && currentHeaders) {
    tables.push({ headers: currentHeaders, rows: currentRows });
  }

  return tables;
}

/**
 * Xuất danh sách bảng Markdown thành file Excel (.xlsx) hoặc CSV và tải về máy
 */
export function exportTablesToSpreadsheet(
  tables: ParsedTable[],
  format: "xlsx" | "csv",
  baseFilename = "bai-giang-du-lieu"
): void {
  if (tables.length === 0) {
    throw new Error("Không tìm thấy bảng Markdown nào trong văn bản");
  }

  const workbook = XLSX.utils.book_new();

  tables.forEach((table, index) => {
    const data = [table.headers, ...table.rows];
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    const sheetName = `Bang_${index + 1}`.slice(0, 31);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  });

  const ext = format === "xlsx" ? "xlsx" : "csv";
  const filename = `${baseFilename}.${ext}`;
  XLSX.writeFile(workbook, filename, { bookType: format });
}

/**
 * Chuyển đổi mã HTML (từ Google Docs copy hoặc HTML file) sang định dạng Markdown chuẩn cho LMS
 */
export function htmlToLmsMarkdown(html: string): string {
  if (typeof window === "undefined") return html;

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  function processNode(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent || "";
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return "";
    }

    const el = node as HTMLElement;
    const tagName = el.tagName.toLowerCase();

    // Xử lý các thẻ con đệ quy
    const childrenText = Array.from(el.childNodes).map(processNode).join("");

    switch (tagName) {
      case "h1":
        return `\n# ${childrenText.trim()}\n\n`;
      case "h2":
        return `\n## ${childrenText.trim()}\n\n`;
      case "h3":
        return `\n### ${childrenText.trim()}\n\n`;
      case "h4":
        return `\n#### ${childrenText.trim()}\n\n`;
      case "h5":
        return `\n##### ${childrenText.trim()}\n\n`;
      case "h6":
        return `\n###### ${childrenText.trim()}\n\n`;
      case "b":
      case "strong":
        return childrenText.trim() ? ` **${childrenText.trim()}** ` : "";
      case "i":
      case "em":
        return childrenText.trim() ? ` *${childrenText.trim()}* ` : "";
      case "u":
        return childrenText.trim() ? ` <u>${childrenText.trim()}</u> ` : "";
      case "code":
        return ` \`${childrenText.trim()}\` `;
      case "pre":
        return `\n\`\`\`\n${childrenText.trim()}\n\`\`\`\n\n`;
      case "blockquote":
        return `\n> [!NOTE]\n> ${childrenText.trim().replace(/\n/g, "\n> ")}\n\n`;
      case "p":
        return childrenText.trim() ? `\n${childrenText.trim()}\n\n` : "\n";
      case "br":
        return "\n";
      case "ul": {
        const items = Array.from(el.querySelectorAll(":scope > li"))
          .map((li) => `- ${Array.from(li.childNodes).map(processNode).join("").trim()}`)
          .join("\n");
        return `\n${items}\n\n`;
      }
      case "ol": {
        const items = Array.from(el.querySelectorAll(":scope > li"))
          .map((li, idx) => `${idx + 1}. ${Array.from(li.childNodes).map(processNode).join("").trim()}`)
          .join("\n");
        return `\n${items}\n\n`;
      }
      case "table": {
        const rows = Array.from(el.querySelectorAll("tr"));
        if (rows.length === 0) return "";

        const matrix: string[][] = [];
        rows.forEach((tr) => {
          const cells = Array.from(tr.querySelectorAll("th, td")).map((c) =>
            Array.from(c.childNodes).map(processNode).join("").replace(/[\r\n]+/g, " ").replace(/\|/g, "\\|").trim()
          );
          if (cells.length > 0) matrix.push(cells);
        });

        if (matrix.length === 0) return "";
        const maxCols = Math.max(...matrix.map((r) => r.length));
        const headers = matrix[0];
        while (headers.length < maxCols) headers.push(`Cột ${headers.length + 1}`);

        const headerLine = `| ${headers.map((h) => h || "-").join(" | ")} |`;
        const sepLine = `| ${headers.map(() => "---").join(" | ")} |`;
        const bodyLines = matrix.slice(1).map((r) => {
          const p = [...r];
          while (p.length < maxCols) p.push("");
          return `| ${p.join(" | ")} |`;
        });

        return `\n${[headerLine, sepLine, ...bodyLines].join("\n")}\n\n`;
      }
      case "a": {
        const href = el.getAttribute("href") || "#";
        return `[${childrenText.trim() || href}](${href})`;
      }
      case "img": {
        const src = el.getAttribute("src") || "";
        const alt = el.getAttribute("alt") || "Hình ảnh";
        return `![${alt}](${src})`;
      }
      case "hr":
        return "\n---\n\n";
      default:
        return childrenText;
    }
  }

  const rawMarkdown = processNode(doc.body);
  return rawMarkdown
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+$/gm, "")
    .trim();
}

/**
 * Chuyển Markdown thành Rich Text HTML để dán trực tiếp vào Google Docs
 */
export function markdownToGoogleDocsHtml(markdown: string): string {
  let html = markdown
    // Headers
    .replace(/^# (.*$)/gim, '<h1 style="font-size:24pt;font-weight:bold;color:#1e293b;margin:18pt 0 6pt 0;">$1</h1>')
    .replace(/^## (.*$)/gim, '<h2 style="font-size:18pt;font-weight:bold;color:#334155;margin:14pt 0 4pt 0;">$1</h2>')
    .replace(/^### (.*$)/gim, '<h3 style="font-size:14pt;font-weight:bold;color:#475569;margin:10pt 0 2pt 0;">$1</h3>')
    // Callouts & Alerts
    .replace(
      /> \[!NOTE\]\s*\n> (.*$)/gim,
      '<div style="background-color:#f0f9ff;border-left:4px solid #0284c7;padding:10pt;margin:10pt 0;border-radius:4px;"><strong style="color:#0369a1;">Lưu ý:</strong> $1</div>'
    )
    .replace(
      /> \[!TIP\]\s*\n> (.*$)/gim,
      '<div style="background-color:#f0fdf4;border-left:4px solid #16a34a;padding:10pt;margin:10pt 0;border-radius:4px;"><strong style="color:#15803d;">Mẹo hay:</strong> $1</div>'
    )
    .replace(
      /> \[!IMPORTANT\]\s*\n> (.*$)/gim,
      '<div style="background-color:#fff7ed;border-left:4px solid #ea580c;padding:10pt;margin:10pt 0;border-radius:4px;"><strong style="color:#c2410c;">Quan trọng:</strong> $1</div>'
    )
    // Blockquote
    .replace(/^> (.*$)/gim, '<blockquote style="border-left:3px solid #cbd5e1;margin:8pt 0;padding-left:12pt;color:#64748b;font-style:italic;">$1</blockquote>')
    // Bold, Italic, Code
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, '<code style="background-color:#f1f5f9;color:#0f172a;padding:2px 5px;border-radius:3px;font-family:monospace;">$1</code>')
    // Horizontal Rule
    .replace(/^---$/gm, '<hr style="border:none;border-top:1px solid #e2e8f0;margin:16pt 0;" />')
    // Code blocks
    .replace(/```([a-z]*)\n([\s\S]*?)```/g, '<pre style="background-color:#0f172a;color:#f8fafc;padding:12pt;border-radius:6px;font-family:Consolas,monospace;overflow-x:auto;">$2</pre>')
    // Bullet lists
    .replace(/^- (.*$)/gim, '<li style="margin-left:20pt;">$1</li>')
    // Numbered lists
    .replace(/^\d+\. (.*$)/gim, '<li style="margin-left:20pt;list-style-type:decimal;">$1</li>')
    // Paragraphs
    .replace(/\n\n([^<].*?)\n\n/g, '<p style="margin:8pt 0;line-height:1.6;color:#334155;">$1</p>');

  // Bảng biểu Markdown -> HTML Table có style rõ ràng cho Google Docs
  const tables = extractTablesFromMarkdown(markdown);
  tables.forEach((tbl) => {
    const originalMdTablePattern = new RegExp(`\\|.*${tbl.headers[0]}.*\\|[\\s\\S]*?\\n(?=\\n|$)`);
    const tableHtml = `
      <table style="border-collapse:collapse;width:100%;margin:12pt 0;font-family:sans-serif;font-size:11pt;">
        <thead>
          <tr style="background-color:#f1f5f9;">
            ${tbl.headers.map((h) => `<th style="border:1px solid #cbd5e1;padding:8pt 10pt;text-align:left;font-weight:600;color:#1e293b;">${h}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${tbl.rows
            .map(
              (r, idx) => `
            <tr style="background-color:${idx % 2 === 0 ? "#ffffff" : "#f8fafc"};">
              ${r.map((c) => `<td style="border:1px solid #cbd5e1;padding:8pt 10pt;color:#334155;">${c}</td>`).join("")}
            </tr>`
            )
            .join("")}
        </tbody>
      </table>
    `;
    html = html.replace(originalMdTablePattern, tableHtml);
  });

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1e293b;line-height:1.6;">
      ${html}
    </body>
    </html>
  `;
}

/**
 * Sao chép nội dung vào Clipboard dưới cả 2 dạng: HTML (để dán đẹp vào Google Docs / Word)
 * và Plain Text (Markdown thuần)
 */
export async function copyToGoogleDocsClipboard(markdown: string): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.clipboard) {
    return false;
  }

  const html = markdownToGoogleDocsHtml(markdown);

  try {
    const htmlBlob = new Blob([html], { type: "text/html" });
    const textBlob = new Blob([markdown], { type: "text/plain" });
    const item = new ClipboardItem({
      "text/html": htmlBlob,
      "text/plain": textBlob
    });
    await navigator.clipboard.write([item]);
    return true;
  } catch {
    await navigator.clipboard.writeText(markdown);
    return false;
  }
}
