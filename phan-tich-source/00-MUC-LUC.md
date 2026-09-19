# Bộ báo cáo đánh giá dự án CoreStack (modular-fullstack-base)

> Báo cáo được viết dưới góc nhìn giảng viên lập trình, dành cho học viên đọc và tự đối chiếu với source code.
> Ngày phân tích: 19/09/2026. Nhánh được phân tích: `review` (commit `57f815d`).
> Toàn bộ nhận định đều dựa trên việc đọc source code tĩnh; **không có dòng code nào bị chỉnh sửa**.

## 1. Giới thiệu

CoreStack là một "fullstack base project" gồm:

- `frontend/`: Next.js 15 (App Router), React 19, TanStack Query, Axios, Tailwind 4.
- `backend/`: Express 5 (ESM), Prisma 6, PostgreSQL 16, pg-boss, nodemailer, jose, argon2.
- `docs/`: tài liệu kiến trúc/API/triển khai (rất ngắn).
- `CODEX_PROJECT_SETUP.md` + `README.md`: đặc tả và checklist tiến độ do một AI agent (Codex) thực thi.

Bộ báo cáo này trả lời ba câu hỏi: **hệ thống này đang là gì**, **nó có vấn đề ở đâu và vì sao**, và **học viên nên sửa/học gì tiếp theo**.

## 2. Phạm vi đã kiểm tra

| Khu vực | Đã đọc | Ghi chú |
| --- | --- | --- |
| Cấu trúc thư mục, `.gitignore`, lịch sử git (11 commit) | Có | Toàn bộ |
| Backend `src/` (129 file TS), `prisma/` (schema, 3 migration, seed), `tests/` (17 file) | Có | Đọc từng file |
| Frontend `src/` (78 file TS/TSX), `next.config.ts`, `tsconfig.json`, eslint | Có | Đọc từng file |
| `package.json`, lockfile (kiểm tra phiên bản), Dockerfile x2, `docker-compose.yml`, `.env.example` x2 | Có | |
| `docs/` (14 file), `AGENTS.md`, `.agents/skills/` | Có | |

## 3. Phạm vi chưa thể kiểm tra (và lý do)

| Hạng mục | Lý do |
| --- | --- |
| Chạy `pnpm lint`, `typecheck`, `test`, `build` | Máy phân tích **không có `node_modules`**; nguyên tắc không cài package. Mọi kết luận về lint/test là suy luận từ code, được đánh dấu "cần chạy để xác nhận". |
| Chạy migration/seed trên PostgreSQL thật | Không có database và không được phép ghi dữ liệu. Kết luận về drift schema dựa trên đối chiếu `schema.prisma` với file SQL trong `migrations/`. |
| Google OAuth, SMTP, Cloudflare R2 thực tế | Không có credentials; chỉ đánh giá logic. |
| Build Docker image | Không chạy Docker; đánh giá Dockerfile bằng cách đọc. |
| Đo hiệu năng thực tế (latency, throughput) | Không có môi trường chạy; phần hiệu năng là phân tích định tính từ query và luồng xử lý. |
| Hành vi runtime của thư viện (pg-boss, cors, multer) | Dựa trên API đã được tài liệu hoá của phiên bản trong lockfile; nêu rõ ở từng vấn đề. |

## 4. Danh sách báo cáo

| File | Nội dung |
| --- | --- |
| [01-TONG-QUAN-DU-AN.md](01-TONG-QUAN-DU-AN.md) | Mục tiêu, actor, chức năng, công nghệ, mức độ hoàn thiện |
| [02-TU-DUY-HE-THONG.md](02-TU-DUY-HE-THONG.md) | Thành phần, phụ thuộc, luồng nghiệp vụ end-to-end, điểm nghẽn, sơ đồ |
| [03-KIEN-TRUC-HIEN-TAI.md](03-KIEN-TRUC-HIEN-TAI.md) | Kiểu kiến trúc, tầng, dependency direction, điểm hợp lý/chưa hợp lý, đề xuất |
| [04-PHAN-TICH-MODULE-VA-LUONG-DU-LIEU.md](04-PHAN-TICH-MODULE-VA-LUONG-DU-LIEU.md) | Trách nhiệm từng module, đầu vào/ra, luồng request và lỗi |
| [05-DANH-SACH-LOI-VA-RUI-RO.md](05-DANH-SACH-LOI-VA-RUI-RO.md) | **Bảng tổng hợp 50 vấn đề** có mã ổn định và phân tích chi tiết |
| [06-CHAT-LUONG-CODE.md](06-CHAT-LUONG-CODE.md) | Clean code, naming, trùng lặp, coupling, error handling, dead code |
| [07-DATABASE-VA-TOAN-VEN-DU-LIEU.md](07-DATABASE-VA-TOAN-VEN-DU-LIEU.md) | Mô hình dữ liệu, ER, constraint/index, transaction, migration, rủi ro dữ liệu |
| [08-BAO-MAT-VA-PHAN-QUYEN.md](08-BAO-MAT-VA-PHAN-QUYEN.md) | Authentication, RBAC, validation, secret, session/token, upload, CORS |
| [09-HIEU-NANG-VA-KHA-NANG-MO-RONG.md](09-HIEU-NANG-VA-KHA-NANG-MO-RONG.md) | Query, cache, queue, khả năng chịu tải, scale |
| [10-KIEM-THU-VA-DO-TIN-CAY.md](10-KIEM-THU-VA-DO-TIN-CAY.md) | Test hiện có, độ phủ thực tế, test cần bổ sung, khả năng phục hồi |
| [11-TRIEN-KHAI-VA-VAN-HANH.md](11-TRIEN-KHAI-VA-VAN-HANH.md) | Build/deploy, Docker, CI/CD, logging, backup, rollback |
| [12-LO-TRINH-CAI-THIEN.md](12-LO-TRINH-CAI-THIEN.md) | Lộ trình 5 mức ưu tiên, phụ thuộc, kết quả mong đợi |
| [13-NHAN-XET-DANH-CHO-HOC-VIEN.md](13-NHAN-XET-DANH-CHO-HOC-VIEN.md) | Nhận xét của người thầy: điểm tốt, lỗi hệ thống, kiến thức cần bổ sung |

## 5. Thống kê nhanh

| Mức độ | Số lượng | Mã tiêu biểu |
| --- | --- | --- |
| Critical | 2 | DB-001 (schema không có migration), SEC-001 (Jobs API không phân quyền) |
| High | 8 | SEC-003 (Host header poisoning link đăng nhập), ERR-001 (CORS chặn PUT), ERR-002 (interceptor 401 reload trang), SEC-004 (upload không giới hạn bộ nhớ) |
| Medium | 22 | ERR-004 (payload job bị bỏ qua), ERR-006 (tài khoản chưa xác minh bị kẹt), CODE-001 (82/207 file viết 1 dòng) |
| Low | 18 | SEC-010 (user enumeration), ERR-013 (session "Current" sai) |
| **Tổng** | **50** | |

Phân loại theo nhóm: SEC 14, ERR 16, ARCH 2, DB 4, CODE 6, OPS 4, TEST 1, DOC 1, PERF 2.

## 6. Cách đọc bộ báo cáo

1. Đọc `01` và `02` để nắm bức tranh tổng thể.
2. Đọc `05` để biết cụ thể lỗi ở đâu; mỗi mã lỗi được nhắc lại trong các file chuyên đề `06`–`11`.
3. Đọc `12` để biết thứ tự sửa.
4. Đọc `13` để hiểu vì sao các lỗi này xuất hiện và cần thay đổi tư duy gì.

Quy ước trong toàn bộ báo cáo:

- **[Đã xác nhận]**: có bằng chứng trực tiếp trong code.
- **[Rủi ro tiềm ẩn]**: logic cho thấy có thể xảy ra, chưa tái hiện được vì thiếu môi trường.
- **[Chưa đủ dữ liệu]**: cần chạy hoặc cần thông tin ngoài repo mới kết luận được.
