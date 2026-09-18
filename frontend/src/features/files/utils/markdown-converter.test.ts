import { describe, expect, it } from "vitest";
import {
  rawTableDataToMarkdown,
  extractTablesFromMarkdown,
  markdownToGoogleDocsHtml
} from "./markdown-converter";

describe("markdown-converter", () => {
  it("converts raw tab-separated Google Sheets table data to Markdown table", () => {
    const tsvData = "Mã môn\tTên môn học\tSố tín chỉ\nCS101\tLập trình cơ bản\t3\nCS201\tCấu trúc dữ liệu\t4";
    const md = rawTableDataToMarkdown(tsvData);

    expect(md).toContain("| Mã môn | Tên môn học | Số tín chỉ |");
    expect(md).toContain("| --- | --- | --- |");
    expect(md).toContain("| CS101 | Lập trình cơ bản | 3 |");
    expect(md).toContain("| CS201 | Cấu trúc dữ liệu | 4 |");
  });

  it("converts comma-separated CSV data to Markdown table", () => {
    const csvData = "STT,Tên học viên,Điểm thi\n1,Nguyễn Văn A,9.5\n2,Trần Thị B,8.0";
    const md = rawTableDataToMarkdown(csvData);

    expect(md).toContain("| STT | Tên học viên | Điểm thi |");
    expect(md).toContain("| 1 | Nguyễn Văn A | 9.5 |");
  });

  it("extracts markdown tables into structured matrix", () => {
    const markdown = `
# Danh sách lớp học

| Họ và tên | Email | Điểm |
| --- | --- | --- |
| Nguyễn Văn A | a@gmail.com | 10 |
| Lê Văn B | b@gmail.com | 8 |

Một đoạn văn bản khác...
    `;

    const tables = extractTablesFromMarkdown(markdown);
    expect(tables).toHaveLength(1);
    expect(tables[0].headers).toEqual(["Họ và tên", "Email", "Điểm"]);
    expect(tables[0].rows).toHaveLength(2);
    expect(tables[0].rows[0]).toEqual(["Nguyễn Văn A", "a@gmail.com", "10"]);
    expect(tables[0].rows[1]).toEqual(["Lê Văn B", "b@gmail.com", "8"]);
  });

  it("formats LMS callouts and markdown elements for Google Docs HTML", () => {
    const markdown = `# Tiêu đề bài giảng
> [!NOTE]
> Ghi chú quan trọng cho giáo viên

> [!TIP]
> Mẹo giải bài tập nhanh

**Nội dung in đậm** và *in nghiêng*
`;

    const html = markdownToGoogleDocsHtml(markdown);
    expect(html).toContain("<h1");
    expect(html).toContain("Tiêu đề bài giảng");
    expect(html).toContain("Lưu ý:");
    expect(html).toContain("Mẹo hay:");
    expect(html).toContain("<strong>Nội dung in đậm</strong>");
  });
});
