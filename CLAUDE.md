# CLAUDE.md

@AGENTS.md

## Dự án

- CoreStack gồm hai app độc lập (không phải monorepo workspace):
  - `frontend/`: Next.js 15, React 19, TanStack Query, Tailwind
  - `backend/`: Express 5 ESM, Prisma và PostgreSQL 16; pg-boss worker chỉ thêm khi bắt đầu phase background jobs
- Dùng `pnpm`, chạy lệnh trong thư mục của từng app.
- `CODEX_PROJECT_SETUP.md` là roadmap/đặc tả, `README.md` là checklist roadmap, `docs/` chứa tài liệu chi tiết.
- Verify trong app bị ảnh hưởng: `pnpm lint`, `pnpm typecheck`, `pnpm test`. Thêm `pnpm build` khi đổi config/build. Cuối cùng chạy `git diff --check`.
- Code theo `CODEX_PROJECT_SETUP.md` và `docs/01-KIEN-TRUC-CODE-BASE.md`: mỗi file nên dưới 300 dòng, không đặt business logic trong route, không gọi Prisma trong controller.

## Theo dõi công việc

- Luôn duy trì `CHECKLIST.md` ở gốc project với 3 phần:
  - Trạng thái hiện tại: đang làm gì, bước tiếp theo
  - Công việc: `[x]` xong, `[~]` đang dở, `[ ]` chưa làm
  - Quyết định đã chốt
- `CHECKLIST.md` theo dõi công việc theo phiên, `README.md` là checklist roadmap. Task thuộc roadmap thì cập nhật cả hai.

## Tài liệu

- Viết bằng tiếng Việt. Thuật ngữ chuyên ngành giữ tiếng Anh, giải thích nghĩa khi cần. Sơ đồ dùng Mermaid.
- File documentation mới đánh số thứ tự đọc (`01-...`, `02-...`). Không đổi tên file cũ trong `docs/` nếu chưa được yêu cầu.
- Khi có convention, architecture decision hoặc workflow mới thì cập nhật `CLAUDE.md` thật ngắn gọn. Chi tiết đưa vào `docs/`.

## Cách làm việc

- Đọc và hiểu code/config liên quan trước khi sửa. Thiếu thông tin quan trọng thì kiểm tra project trước, chỉ hỏi khi thực sự cần.
- Không tự mở rộng scope, refactor lớn, đổi kiến trúc hay thêm dependency nếu không thực sự cần.
- Trước khi báo hoàn thành: tự test/kiểm tra phù hợp và review `git diff`.
- Hỏi trước khi làm thao tác nguy hiểm: xóa dữ liệu, `prisma migrate reset` hoặc reset DB, `git reset`/`git clean`, force push, đổi cấu hình production.
- Có thể commit sau mỗi task/milestone hoàn thành, nhưng chỉ stage file của task đó (không dùng `git add -A`). **Không tự push.**
- Cuối mỗi turn, dừng các process do Claude tự khởi chạy (dev server, worker, watch). Không đụng các process đã chạy sẵn.

## Báo cáo

Sau mỗi task, báo cáo ngắn gọn bằng tiếng Việt theo thứ tự: đã làm gì → kiểm tra gì → commit gì → còn vấn đề gì → bước tiếp theo.
