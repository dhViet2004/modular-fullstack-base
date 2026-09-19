# Báo cáo review dự án CoreStack — lần 2 (v2)

> Góc nhìn: giảng viên lập trình (Software Architecture, Clean Code, bảo mật, vận hành).
> Ngày review: 20/09/2026 · Nhánh `master` · Commit `d716b13` (source code giống hệt commit `57f815d`).
> Phương pháp: đọc source tĩnh, đối chiếu với đặc tả `CODEX_PROJECT_SETUP.md` và checklist `README.md`. **Không có dòng source code nào bị thay đổi**; lần review này chỉ tạo file trong `review-source/`.

## 1. Bối cảnh

- **Đề bài**: xây một *fullstack base* dùng lại được, theo đặc tả 47 mục trong `CODEX_PROJECT_SETUP.md`: frontend Next.js và backend Express/Prisma độc lập; xác thực password/OTP/magic link/Google; session/device; RBAC có rank và override; mail, jobs (pg-boss), files có dedup và dọn orphan; markdown import/export; audit; Docker.
- **Trình độ học viên**: đang làm bài tập nền tảng, có mentor review qua checklist README, phát triển cùng AI agent theo quy trình trong `AGENTS.md`.
- **Ràng buộc công nghệ**: bắt buộc theo đặc tả (Next.js 15, Express 5 ESM, Prisma, PostgreSQL 16, pg-boss, pnpm, hai app độc lập).

## 2. So với lần review trước (v1)

- **v1**: commit `a52a186`, thư mục `phan-tich-source/` (14 file, 50 vấn đề). Thư mục này **đang bị xóa trong working tree nhưng chưa commit**; vẫn đọc được bằng `git show a52a186:phan-tich-source/<tên file>`.
- **Source code không đổi kể từ v1**: `git diff 57f815d HEAD` chỉ gồm `CLAUDE.md` và `CHECKLIST.md`. Vì vậy **không có tiến bộ và cũng không có thụt lùi về code**. README vẫn tick các mục mà v1 đã chỉ ra là chưa đúng.
- **v2 không chép lại v1** mà xác minh lại độc lập từng vấn đề trên code hiện tại:
  - Cả 50/50 vấn đề của v1 **vẫn còn**.
  - **Hạ mức độ** 2 vấn đề: SEC-005 và SEC-006, từ High xuống Medium. Lý do ở `02` mục 5.
  - **Thu hẹp** 1 vấn đề: SEC-011 (React 19 đã chặn link `javascript:`).
  - **Cập nhật số liệu** 1 vấn đề: CODE-001 (đếm theo tiêu chí khác; không phải tiến bộ).
  - **Phát hiện mới 13 vấn đề**, trong đó đáng chú ý nhất là **SEC-017 (High): chiếm tài khoản trước qua liên kết Google**. Test hiện có đang khẳng định đúng hành vi dễ bị khai thác này.

## 3. Phạm vi

| Đã kiểm tra | Cách làm |
| --- | --- |
| Cấu trúc thư mục, lịch sử git, `.gitignore`, `.dockerignore` | Toàn bộ |
| Backend `src/` (config, middleware, core, 7 module), `prisma/` (schema, 3 migration, seed), `tests/` (17 file) | Đọc từng file, tách dòng để đọc các file bị nén |
| Frontend: lớp auth/axios/query, layout, trang auth, dashboard shell, users/sessions/mail/files | Đọc trọng tâm; các component > 500 dòng đọc theo điểm nghi vấn (grep có chủ đích) |
| `package.json`, Dockerfile ×2, `docker-compose.yml`, `.env.example` ×2 (không in giá trị), eslint/tsconfig/vitest config | Toàn bộ |
| `README.md`, `CODEX_PROJECT_SETUP.md`, `docs/` (14 file), `AGENTS.md` | Đối chiếu từng mục liên quan |
| Rò rỉ secret | `git grep` các mẫu secret phổ biến; kiểm tra lịch sử git chưa từng commit `.env`: **không phát hiện** |

| Chưa thể kiểm tra | Lý do |
| --- | --- |
| `pnpm lint`, `typecheck`, `test`, `build` | Máy review không có `node_modules`, và nguyên tắc review không cho cài package |
| Migration/seed trên PostgreSQL thật | Không có DB; không được ghi dữ liệu. DB-001 kết luận bằng cách đối chiếu schema với SQL migration |
| Hành vi trình duyệt (CORS, hydration, interceptor) | Kết luận theo đặc tả cơ chế (CORS preflight, React 19), ghi rõ ở từng mục |
| Hành vi runtime của pg-boss 12 | Dựa trên API đã được tài liệu hóa (handler nhận mảng job từ v10) |
| Google OAuth, SMTP, Cloudflare R2 thật | Không có credentials |
| Build Docker image, đo hiệu năng | Không chạy Docker; phần hiệu năng là phân tích định tính |

## 4. Thống kê

### 4.1 Theo mức độ

| Mức độ | Số lượng | Mã |
| --- | --- | --- |
| Critical | 2 | SEC-001, DB-001 |
| High | 7 | SEC-002, SEC-003, SEC-004, **SEC-017**, ERR-001, ERR-002, ERR-003 |
| Medium | 29 | SEC-005, SEC-006, SEC-007, SEC-008, SEC-009, **SEC-015**, ERR-004…011, **ERR-017**, **ERR-018**, **ERR-020**, ARCH-001, ARCH-002, **ARCH-003**, OPS-001…003, CODE-001…003, TEST-001, DB-002, DOC-001 |
| Low | 25 | SEC-010…014, **SEC-016**, ERR-012…016, **ERR-019**, **ERR-021**, **ERR-022**, CODE-004…006, PERF-001, PERF-002, OPS-004, **OPS-005**, DB-003, DB-004, **DB-005**, **ARCH-004** |
| **Tổng** | **63** | 50 từ v1 + 13 mới (in đậm) |

### 4.2 Theo nhóm

| SEC | ERR | DB | ARCH | CODE | OPS | TEST | DOC | PERF |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 17 | 22 | 5 | 4 | 6 | 5 | 1 | 1 | 2 |

### 4.3 Theo độ chắc chắn

- **Xác nhận**: 56/63 vấn đề, tức đọc code là đủ kết luận.
- **Tiềm ẩn**: 7 vấn đề, là race condition hoặc phụ thuộc hạ tầng: ERR-003, ERR-005, ERR-012, ERR-018, ERR-020, ERR-021, OPS-003.
- **Chưa đủ DL**: có một phần ở 2 trong số các vấn đề đã xác nhận: CODE-004 (kết quả lint), OPS-001 (hành vi runtime của image).

## 5. Ba vấn đề nghiêm trọng nhất

1. **SEC-001 (Critical): Jobs API không có phân quyền.** Bất kỳ ai tự đăng ký tài khoản đều có thể lập lịch gửi email tùy ý qua SMTP của hệ thống (lừa đảo từ domain chính thức), chạy job tạm khóa user hàng loạt, xóa audit log, hoặc tắt các job dọn dẹp. Bằng chứng: `backend/src/modules/jobs/job.routes.ts:7-15` không có `authorize`; `job.controller.ts:84,109` nhận `queue`/`payload` và `req.body` từ client.
2. **SEC-017 (High, thành Critical nếu trúng email bootstrap SUPER_ADMIN): chiếm tài khoản trước qua liên kết Google.** Kẻ tấn công đăng ký trước bằng email của nạn nhân. Khi nạn nhân đăng nhập Google, `identity.service.ts` gắn Google vào đúng tài khoản chưa xác minh đó, đánh dấu đã xác minh, và giữ nguyên mật khẩu của kẻ tấn công. Test `google-identity-sync.test.ts:31-38` đang khẳng định hành vi này.
3. **DB-001 (Critical): schema có bảng/cột không có migration.** Môi trường dựng từ migration sẽ lỗi seed và lỗi đăng nhập (500), trong khi README tick "`db:migrate` pass".

## 6. Danh sách báo cáo

| File | Nội dung |
| --- | --- |
| [01-TONG-QUAN-VA-KIEN-TRUC.md](01-TONG-QUAN-VA-KIEN-TRUC.md) | Mục tiêu, actor, mức hoàn thiện module, sơ đồ kiến trúc, luồng dữ liệu, điểm nghẽn |
| [02-VAN-DE-VA-RUI-RO.md](02-VAN-DE-VA-RUI-RO.md) | **Bảng 63 vấn đề** (Mã, Mức độ, Nhóm, Vị trí, Vấn đề, Ảnh hưởng, Hướng xử lý); phân tích chi tiết Critical/High và vấn đề mới; điều chỉnh so với v1 |
| [03-BAO-MAT-VA-DATABASE.md](03-BAO-MAT-VA-DATABASE.md) | Xác thực, phân quyền (ma trận route, đường leo thang quyền), session/token, secret, upload, CORS, injection; mô hình dữ liệu, constraint, transaction, migration |
| [04-CHAT-LUONG-VA-VAN-HANH.md](04-CHAT-LUONG-VA-VAN-HANH.md) | Số liệu code, code nén, phân tầng, xử lý lỗi, dấu hiệu code AI thiếu kiểm soát; hiện trạng test và test còn thiếu; Docker/CI/logging; checklist production |
| [05-LO-TRINH-CAI-THIEN.md](05-LO-TRINH-CAI-THIEN.md) | Làm ngay / trước khi deploy / phiên bản sau / khi tăng trưởng / KHÔNG nên làm, kèm cột kiểm chứng |
| [06-NHAN-XET-HOC-VIEN.md](06-NHAN-XET-HOC-VIEN.md) | Nhận xét của người thầy: điểm tốt, tư duy cần phát huy, lỗi mang tính hệ thống, kiến thức cần học theo thứ tự |

**Cách đọc gợi ý**: `00` → `06` (để hiểu bức tranh và thái độ cần có) → `05` (biết làm gì trước) → `02` (chi tiết từng lỗi khi bắt tay sửa) → `03`/`04` khi cần hiểu sâu một chủ đề.

## 7. Quy ước

- **Mức độ**:
  - Critical: bị khai thác hoặc hỏng hệ thống trên diện rộng, sửa ngay.
  - High: rủi ro lớn hoặc hỏng chức năng chính.
  - Medium: lỗi thật nhưng phạm vi hẹp hoặc cần điều kiện.
  - Low: cải thiện chất lượng hoặc rủi ro nhỏ.
- **Kết luận**:
  - Xác nhận: có bằng chứng trực tiếp trong code.
  - Tiềm ẩn: logic cho thấy có thể xảy ra, chưa tái hiện.
  - Chưa đủ DL: cần chạy hoặc cần thông tin ngoài repo.
- **Vị trí**: `đường-dẫn:dòng` với file nhiều dòng; `đường-dẫn` (`tên hàm`) với file bị nén 1–3 dòng.
- Báo cáo **không chứa giá trị thật của bất kỳ secret nào**.
