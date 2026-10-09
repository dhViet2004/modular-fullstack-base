# CHECKLIST

> Theo dõi công việc theo phiên. `README.md` giữ checklist roadmap cấp sản phẩm; `CODEX_PROJECT_SETUP.md` giữ yêu cầu nền tảng.

## Trạng thái hiện tại

- **Phase hiện tại:** Phase A.4 — Permission Guard Cleanup
- **Đang làm:** A.1/A.2 DONE; A.3/A.4 implementation/verification VERIFIED; đối chiếu visual chi tiết PARTIAL
- **Bước tiếp theo:** Đối chiếu chi tiết visual còn thiếu khi có nguồn Figma; chỉ triển khai Product sau khi có screenshot/context
- **Blocker:** A.4 không có blocker; Figma MCP hết quota vẫn chặn chi tiết visual/asset và 75 frame Product & Handoff

## Quy ước trạng thái

- `[x]` Đã implement và verify.
- `[~]` Đang thực hiện.
- `[ ]` Chưa làm.
- `BLOCKED:` Bị chặn bởi môi trường hoặc credential bên ngoài.

---

## Phase 0 — Agent rules và project setup

- [x] Tạo `AGENTS.md`
- [x] Tạo `CLAUDE.md`
- [x] Tạo `CODEX_PROJECT_SETUP.md`
- [x] Tạo `CHECKLIST.md`
- [x] Tạo, cấu hình implicit invocation và validate skill `roadmap-checklist`
- [x] Tạo role riêng cho backend tại `.agents/roles/backend.md`
- [x] Tạo role riêng cho frontend tại `.agents/roles/frontend.md`
- [x] Tạo README cơ bản
- [x] Chuẩn hóa README dùng `pnpm` trực tiếp sau bước kích hoạt Corepack
- [x] Kiểm tra toàn bộ tài liệu không mâu thuẫn

## Phase 1 — Repository structure

- [x] Tạo `frontend/`
- [x] Tạo `backend/`
- [x] Tạo `docs/`
- [x] Tạo `.gitignore`
- [x] Tạo frontend package và lockfile riêng
- [x] Tạo backend package và lockfile riêng
- [x] Tạo README cho frontend
- [x] Tạo README cho backend

## Phase 2 — Backend skeleton

- [x] Tạo Express app
- [x] Tạo server entrypoint
- [x] Tạo worker entrypoint — triển khai cùng background email verification job
- [x] Tạo config/env và validation bằng Zod
- [x] Tạo error middleware nền tảng
- [x] Tạo API routes
- [x] Tạo health endpoint
- [x] Tách liveness `/health` và readiness `/ready` kiểm tra PostgreSQL
- [x] Viết và chạy health integration test
- [x] Verify backend lint, typecheck, test và build

## Phase 3 — Frontend skeleton

- [x] Tạo Next.js App Router
- [x] Tạo TanStack Query provider
- [x] Tạo Axios API client
- [x] Tạo layout cơ bản
- [x] Tạo trang home
- [x] Viết và chạy test nền tảng
- [x] Verify frontend lint, typecheck, test và build

## Phase 4 — Database

- [x] Tạo Prisma schema baseline
- [x] Tạo migration đầu tiên
- [x] Tạo seed kiểm tra kết nối
- [x] Tạo Prisma client wrapper
- [x] Verify Prisma schema và generate client
- [x] Verify migrate trên PostgreSQL thật
- [x] Verify seed trên PostgreSQL thật
- [x] Tạo và build Docker migration target riêng

## Phase 5 — Authentication

- [x] Mở rộng `User` model cho authentication
- [x] Tạo password authentication
- [x] Tạo session
- [x] Tạo refresh token rotation
- [x] Tạo logout và revoke session
- [x] Tạo auth tests

## Phase 6 — Authorization

- [x] Tạo role
- [x] Tạo permission
- [x] Tạo authenticate middleware
- [x] Tạo authorize middleware
- [x] Viết RBAC tests
- [x] Tự động chuyển tài khoản có `users:read` tới giao diện quản trị sau đăng nhập

## Phase 7 — Documentation

- [x] Viết architecture docs nền tảng
- [x] Viết hướng dẫn tự code Module 01 — Users foundation
- [x] Viết API docs
- [x] Viết database docs
- [x] Viết local setup docs trong `README.md`
- [x] Viết deployment docs

## Phase 8 — Audit Log

- [x] Chốt phạm vi, event catalog và transaction policy
- [x] Thêm model `AuditLog` và migration
- [x] Thêm permission `audit:read` và cập nhật seed
- [x] Tạo audit repository/service và test
- [x] Tích hợp audit vào login/logout
- [x] Tạo API đọc audit log có cursor pagination
- [x] Tạo frontend quản trị audit log
- [x] Verify migration, seed, backend và frontend
- [x] Đồng bộ API docs và database docs

## Phase 9 — Email Verification

- [x] Chốt token policy, public URL và API contract
- [x] Thêm config TTL/cooldown và model token
- [x] Tạo migration và generate Prisma Client
- [x] Tạo token utility, repository/service và test
- [x] Chốt và tích hợp mail delivery
- [x] Tạo request/verify API và audit events
- [x] Tạo frontend request/verify flow
- [x] Verify migration, backend, frontend và smoke test
- [x] Đồng bộ API docs và database docs

## Phase 10 — Google OAuth

- [x] Chốt Authorization Code + PKCE flow và API contract
- [x] Thêm Google config, model và migration
- [x] Tạo state/PKCE utility và test
- [x] Tạo Google token client và ID token verification
- [x] Tạo repository/service liên kết hoặc tạo user
- [x] Tạo start/callback API và audit events
- [x] Tạo frontend Google login/callback flow
- [x] Đồng bộ Google OAuth local về backend 4000/frontend 3000, đồng bộ API origin/CORS/callback; smoke test health/readiness/start/callback/link đạt và 5 frontend auth API tests pass; chưa kiểm chứng đăng nhập Google thật
- [x] Verify migration, backend, frontend và smoke test
- [x] Đồng bộ API/database docs và roadmap
- [x] Thêm cờ bật/tắt email xác thực toàn hệ thống, chỉ SUPER_ADMIN được quản lý

## Phase 11 — Worker pg-boss

- [x] Cài pg-boss, tạo lệnh cài schema/queue riêng và worker entrypoint
- [x] Chuyển yêu cầu gửi email xác minh sang queue chỉ chứa `userId`
- [x] Worker tạo token và gửi SMTP; queue retry khi lỗi
- [x] Cập nhật UI, API và deployment docs cho phản hồi `202` bất đồng bộ
- [x] Verify lint, typecheck, test, build, cài queue và khởi động worker

## Phase 12 — Files/storage

- [x] Upload/download riêng tư bằng local storage, giới hạn 5 MiB trước khi buffer và test HTTP
- [x] Cloudflare R2 storage cho production
- [x] Verify đầy đủ và nghiệm thu Files/storage — upload/download R2 thật trả đúng nội dung

## Phase 13 — CI

- [x] Tạo workflow riêng cho backend và frontend với pnpm lockfile độc lập
- [x] Backend chạy PostgreSQL, Prisma migrate/seed, kiểm tra drift, format, lint, typecheck, test và build
- [x] Frontend chạy lint, typecheck, test và build
- [~] Kiểm chứng workflow trên GitHub Actions — actionlint và lệnh local đã đạt; chờ run trên push/PR

## Phase A — Shared Design System

- [x] A.1: Inter, semantic colors, typography 150%, spacing/radius và shared container co giãn tối đa 1280px; giữ nguyên layout feature hiện có
- [x] A.1: Restyle navigation hiện tại, focus ring và skip link; không đổi authentication, RBAC, hooks hoặc API
- [x] A.1: Frontend lint/typecheck/test/build pass; 29 test (11 contrast cases mới); Chrome headless pass 30 trường hợp trên 6 route ở 320/390/768/1280/1600px, keyboard/AX tree và tên tài khoản dài; API dùng fixture, không xác nhận integration backend thật
- [x] A.2 — DONE: Button (6 variants), Input (text/email/password/search/native select), Card, RoleBadge, Switch, Checkbox, InlineAlert, Toast, ConfirmDialog, Skeleton và native indeterminate Progress; dùng semantic tokens và geometry đã xác minh
- [x] A.2 — DONE: Native disabled/loading, labels/errors, keyboard/focus-visible, modal Escape/Tab/focus restore; giữ React Hook Form refs và không đổi API/hooks/schemas/RBAC
- [x] A.2 — DONE: Refactor presentation tối thiểu LoginForm/RegisterForm, Card của hai auth page và RoleBadge trong navigation hiện có
- [x] A.2 — DONE: Frontend lint/typecheck/test/build pass; 50 tests/7 files (16 component cases và 5 contrast cases mới); Chrome pass interactive checks và 25 route/width cases ở 320/390/768/1280/1600px, dialog fixture ở cả 5 độ rộng; login/register chống submit lặp và phục hồi sau lỗi; API fixtures, không gọi backend thật
- [~] A.2 — PARTIAL: Đối chiếu visual từng state, per-role badge colors và assets icon gốc; dùng semantic/native/text fallback được ghi rõ trong DESIGN_SYSTEM.md, chưa xác nhận pixel fidelity
- [x] A.3 — VERIFIED: AppShell/Sidebar dùng semantic tokens; expanded 248px, collapsed 72px, topbar 64px, avatar 32px; active/hover/disabled/focus; account dropdown dùng RoleBadge và LogoutButton hiện có
- [x] A.3 — VERIFIED: Giữ AuthProvider, RoleDashboard, getNavigationItems, getPostLoginPath và quyền backend; ADMIN không có menu SUPER_ADMIN/email policy/cấp-gỡ ADMIN; không thêm route hoặc sửa Product content
- [x] A.3 — VERIFIED: Drawer mobile native dialog với Escape/Tab/Shift+Tab/focus restore, đóng khi chọn route hoặc resize sang tablet; giữ skip link A.1; breakpoint <768 / 768–1199 / >=1200 được ghi UI PROPOSAL
- [x] A.3 — VERIFIED: Frontend lint/typecheck/test/build pass; 55 tests/8 files; Chrome ở 320/390/768/1280/1600px, 25 route/width cases, 6 role-permission combinations trên mobile/desktop, active leaf, refresh thành công/thất bại và logout pending/completion cho 3 roles; API fixtures, không xác nhận backend integration thật
- [~] A.3 — PARTIAL: Breakpoint/drawer và chi tiết visual Product chưa đối chiếu Figma; nav dùng text markers, avatar monogram, badge neutral; không xác nhận pixel fidelity hoặc assets gốc
- [x] A.4 — VERIFIED: Sửa nguyên nhân `/super-admin` render EmailVerificationSetting là sibling ngoài guard; đưa setting thành children của RoleDashboard, chỉ render children sau khi hết loading, có user và có role SUPER_ADMIN; không ẩn bằng CSS hoặc tạo guard framework
- [x] A.4 — VERIFIED: Phân biệt loading (`role=status`), guest/401 và thiếu quyền/403 (`role=alert`, guest có login link), SUPER_ADMIN; giữ AuthProvider/refresh/logout/API/hooks/schema/backend authorization và toàn bộ Product layout được phép
- [x] A.4 — VERIFIED: 7 regression cases mới cho loading với/không có user, guest, MEMBER, ADMIN, SUPER_ADMIN đơn role/đa role; trước fix 5 failed/2 passed, sau fix 7 passed; frontend lint/typecheck/test/build PASS, tổng 62 tests/9 files
- [x] A.4 — VERIFIED: Chrome production PASS tại 390/1280px cho guest/MEMBER/ADMIN/SUPER_ADMIN; giữ riêng refresh và /auth/me để chứng minh loading không gọi cấu hình, không có SUPER_ADMIN không mount/call API, có SUPER_ADMIN mới GET cấu hình; giữ checks A.3 ở 320/390/768/1280/1600px; dùng API fixtures
- [ ] Product & Handoff ngoài B.1 — BLOCKED: 58 frame còn thiếu reference/context do quota; 17 Public & Auth được người dùng xác nhận và cung cấp ảnh tổng hợp để triển khai B.1

Ghi chú A.4: `401/403` là trạng thái UI tương ứng AuthProvider, không đổi HTTP status của Next static page. Flow sau fix: refresh → /auth/me → AuthProvider → RoleDashboard guard → EmailVerificationSetting → API cấu hình khi SUPER_ADMIN; backend `authenticate → assertUserIsSuperAdmin → route handler → systemService → Prisma` giữ nguyên. Không thêm dependency, repository hoặc business rule.

Ghi nhận tại A.4: AuthProvider đưa mọi lỗi restore về `user=null`; việc phân loại này đã được xử lý trong B.1 theo xác nhận mới của người dùng. `system.routes.ts` xử lý HTTP trực tiếp, không có controller riêng; vẫn ngoài scope và không refactor backend.

## Phase B.1 — Public & Auth (2026-10-09)

- [x] Mapping 17 frame đã được người dùng xác nhận; triển khai theo thứ tự Login → Register → Verify Email → OAuth Callback → Session Expired, dùng `docs/figma/references/02 Public & Auth.png`
- [x] Login: Desktop Default, Error, Loading, Mobile; tái sử dụng RHF/Zod/Input/Button/InlineAlert, Google OAuth và điều hướng theo role
- [x] Register: Desktop Default, Validation, Success, Mobile; confirmPassword client-only phải khớp password, API chỉ gửi email/password/displayName; success có nút đăng nhập
- [x] Verify Email: Pending sau thao tác xác nhận thủ công, Success, Invalid, Resend; giữ public token verification và request có Bearer; lỗi network/5xx thử lại được, `202` chỉ xác nhận yêu cầu đã được nhận
- [x] OAuth Callback: Loading, Success chuyển tiếp ngay, Failure; dùng chung lần restore của AuthProvider, không gọi refresh/me hai lần hoặc trì hoãn redirect để giữ Success
- [x] Session Expired: Desktop/Mobile chỉ khi refresh trả `401 INVALID_REFRESH_TOKEN/REFRESH_TOKEN_REUSED` và có bằng chứng phiên trước; guest, network/5xx, unknown 401 và lỗi /me có state riêng
- [x] AuthProvider/interceptor: giữ token trong memory, chỉ lưu cờ boolean trong sessionStorage; refresh thành công retry bình thường; network/5xx giữ user/token/cache/nội dung và shell; retry thủ công; logout hủy refresh, xóa bằng chứng, không kích hoạt expired; bỏ response cũ sau login/logout
- [x] Verify public chỉ cập nhật metadata của user hiện tại cùng ID; không dùng setter đăng nhập để xóa restore-error, đổi bằng chứng phiên hoặc khôi phục user sau logout; Chrome regression PASS
- [x] Giữ AppShell/Sidebar A.3, RBAC, route, backend/schema/Prisma và HTTP API contract; fallback auth giữ `#main-content`/skip link; không thêm dependency hoặc auth state framework
- [x] Regression: 28 cases mới, tổng 90 tests/10 files; auth API và Axios tests liên quan đặt trong `tests/`; bảo vệ payload, manual verification, lỗi body thiếu JSON, classification, stale refresh và logout race
- [x] Frontend `corepack pnpm lint`, `typecheck`, `test`, `build` PASS; lint không warning; production build 15 static pages; root `git diff --check` PASS
- [x] Chrome production PASS: đủ 17 frame, 45 screenshots gồm từng state ở 390/1440px và các kích thước frame 620px; giữ regression primitives/shell/guard A.2–A.4 và 320/390/768/1280/1600px; dùng API fixtures
- [x] Cập nhật DESIGN_SYSTEM.md, SCREEN_MAPPING.md và README.md; manifest `b1-frames.json`/contact sheet nằm trong thư mục artifact local ghi ở tài liệu
- [~] B.1 — VISUAL_PARTIAL: ảnh tổng hợp 4520x4156 đã đối chiếu; thiếu export/context/asset gốc riêng từng frame do Figma MCP hết quota, không tuyên bố pixel-perfect; password toggle Show/Hide và SVG/CSS symbols là fallback
- [~] AUTH-03 Resend cooldown — PARTIAL cho countdown trong Figma: backend không trả deadline/Retry-After đáng tin cậy; hiện hiển thị phản hồi `429`, cho retry thủ công và không hardcode 45 giây

Không có chức năng B.1 bị BLOCKED. Đăng nhập Google thật và delivery email qua worker/SMTP chưa kiểm chứng trong phiên này; Chrome dùng fixtures, không thay thế integration backend.

## Bổ sung phân vai giao diện

- [x] Seed role `SUPER_ADMIN`, giữ `ADMIN` và `MEMBER`; kiểm tra seed trên database
- [x] Điều hướng sau đăng nhập, dashboard và menu theo role/permission; kiểm tra backend/frontend

## Blockers

- Figma MCP hết quota: 75 Product & Handoff frames vẫn thiếu context gốc, native properties bổ sung, full variable dump và asset icons. B.1 gồm 17 frame đã triển khai từ reference được người dùng xác nhận, visual VISUAL_PARTIAL; 58 frame ngoài B.1 vẫn BLOCKED.

## Quyết định đã chốt

- `CHECKLIST.md` theo dõi công việc theo phiên; `README.md` theo dõi roadmap và trạng thái nghiệm thu sản phẩm.
- `CLAUDE.md` import `AGENTS.md` để giữ một nguồn quy tắc chung.
- Frontend và backend là hai app độc lập, không dùng monorepo workspace.
- Backend dùng luồng `route → middleware → controller → service → Prisma`; repository là optional khi có persistence responsibility rõ ràng.
- Route chỉ khai báo URL/middleware; controller xử lý HTTP mapping; service chứa business logic và được phép gọi Prisma trực tiếp; repository chỉ dùng khi cần thiết.
- Không tạo trước module hoặc file rỗng; chỉ scaffold khi bắt đầu triển khai nghiệp vụ tương ứng.
- `server.ts` chỉ chạy HTTP API; worker chạy trong entrypoint riêng khi Phase background jobs bắt đầu.
- [x] Giao diện quản lý tệp Markdown cho tài khoản
- [x] Cập nhật bố cục responsive, trạng thái lưu và danh sách bản lưu cho giao diện Files
- [x] Thêm chế độ Review Markdown với nút biểu tượng con mắt
- [x] Giữ header navigation cố định khi cuộn trang
- [~] CRUD qu?n l? file: ?? th?m metadata API v? UI t?o/c?p nh?t/x?a; backend test b? ch?n do Prisma Client native engine ?ang kh?a tr?n Windows
- [x] Ho?n t?t CRUD file v?i metadata b?n v?ng, migration v? giao di?n FE

## Session/device limits

- [x] Gi?i h?n s? phi�n ho?t d?ng theo user b?ng MAX_ACTIVE_SESSIONS_PER_USER v� revoke phi�n cu nh?t
- [x] Access token stateless JWT; authenticate kh?ng lookup session DB, revoke ch? ch?n refresh
- [x] C?p nh?t t�i li?u authentication/API v� c?u h�nh m�i tru?ng
Session account security UI va API doi mat khau da cap nhat.
- [x] Gi?i h?n t?i ?a 10 t?p l?u tr? cho m?i user v? ki?m tra l?i v??t quota
- [x] Refactor module users: gop Prisma vao service, xoa repository pass-through, da verify backend
- [x] Gom session controllers theo capability v? ??a session ID validation v? shared middleware

- [x] ??ng b? session refresh rotation v?i `previousRefreshTokenHash`, `lastUsedAt` v? grace period 30 gi?y.
- [x] R?t g?n Google OAuth v? email verification: gi? controller/service/schema, g?p persistence/token helper v?o service.
