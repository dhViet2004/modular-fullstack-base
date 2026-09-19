# 06. Chất lượng code

Báo cáo này đánh giá code theo các tiêu chí Clean Code, có dẫn chứng, và cố gắng giải thích **vì sao** mỗi điểm là vấn đề chứ không chỉ "chưa tốt".

## 1. Bức tranh chung

| Chỉ số | Giá trị | Ghi chú |
| --- | --- | --- |
| Số file source (`*.ts/*.tsx`, không tính generated) | 207 | backend 129 + tests 17, frontend 61 |
| File viết kiểu "một dòng" (≤3 dòng, >150 byte) | **82 (40%)** | Ví dụ `mail.controller.ts` (3.869 ký tự/dòng), `auth.routes.ts`, `challenge.service.ts`, `session.repository.ts`, `settings/page.tsx`, `mail-manager.tsx` |
| File > 300 dòng (mục tiêu spec) | 8 | Toàn bộ ở frontend |
| File > 500 dòng (hard limit spec) | 5 | `file-manager.tsx` 1100, `role-manager.tsx` 746, `jobs-manager.tsx` 740, `lms-markdown-editor.tsx` 583, `markdown-previewer.tsx` 541 |
| Công cụ format | Không có | Không `.prettierrc`, không `.editorconfig`, không script `format` |
| Lint | ESLint flat config (tseslint recommended; next core-web-vitals + typescript) | Không có rule `max-lines`, `max-len` |
| Comment TODO/FIXME | 0 | Không có nợ kỹ thuật được ghi nhận trong code |

**Hai phong cách tồn tại song song**: một nhóm file được viết chuẩn (2 space, mỗi câu lệnh một dòng, có JSDoc: `r2.storage.ts`, `role.service.ts`, `maintenance.job.ts`, `user.service.ts`, `jobs-manager.tsx`), một nhóm bị "nén" như output của minifier (`auth.controller.ts`, `mail.controller.ts`, `auth.routes.ts`, `session.service.ts`, nhiều page FE). Lịch sử git cho thấy các file nén xuất hiện từ commit `init` và các commit auth sớm; các file chuẩn xuất hiện ở các commit sau (`5091d83`, `57f815d`). Đây là dấu hiệu code do công cụ sinh ở các thời điểm/cấu hình khác nhau mà không có bước chuẩn hoá.

## 2. Clean Code

### 2.1 Điều làm tốt

- Hàm nhỏ, tên rõ ở tầng policy/service: `rbacPolicy.assertCanAct`, `assertCanAssign`, `assertSingleSuperAdmin`; `challengeService.issue/verify`; `sessionService.create/refresh`.
- Nguyên tắc "một pipeline cho mọi login" được thể hiện đúng bằng code (`authService.complete`) — code phản ánh thiết kế.
- Tránh magic number ở vài nơi: `resetMinutes`, `verificationMinutes`, `ttlMs`, `RoleRank`.
- Xử lý race có chủ đích và có comment giải thích (`super-admin-bootstrap.service.ts`: "Serialize bootstrap attempts so BOOTSTRAP_ONCE cannot promote two users…"; `upload.service.ts` bắt unique conflict).

### 2.2 Điều chưa tốt và vì sao

**a) Định dạng một dòng phá vỡ mọi lợi ích của TypeScript và git.**
Ví dụ `backend/src/modules/auth/challenges/challenge.service.ts` (1 câu lệnh 1.295 ký tự) chứa hai chuỗi ternary lồng 4 tầng để map `type → invalidCode/expiredCode`. Cùng logic viết bằng một bảng tra sẽ dễ đọc và dễ mở rộng:

```ts
const CODES = {
  LOGIN_OTP: { invalid: "OTP_INVALID", expired: "OTP_EXPIRED" },
  PASSWORD_RESET: { invalid: "PASSWORD_RESET_INVALID", expired: "PASSWORD_RESET_EXPIRED" },
  // ...
} as const;
```

Hệ quả thực tế: không đặt breakpoint theo dòng; stack trace chỉ tới "line 1"; review diff không khả thi; cùng một hàm không thể có blame theo dòng.

**b) Nhiều nghiệp vụ trong một biểu thức.**
`auth.controller.login`: `res.json(success(await authService.complete(await passwordStrategy.authenticate(req.body.email,req.body.password),info(req))))` — 4 lời gọi lồng nhau trong một dòng. Khi lỗi, không biết bước nào ném.

**c) Controller làm việc của service** (CODE-006). `mail.controller.ts` 3.8K ký tự chứa query audit log, mask cấu hình, tạo OTP, tra session để lấy device… Đây là *God function* trá hình.

## 3. Naming

| Nhận xét | Bằng chứng |
| --- | --- |
| Biến một ký tự lan rộng ngoài lambda ngắn | `(q, r, n)` cho `(req, res, next)` trong `user.controller.ts`, `file.controller.ts`, `mail.controller.ts`; `c` cho controller trong routes; `x`, `m`, `f`, `q` trong FE (`const q=useUsers(), m=useUserAction()`); `i` cho input (`markdown-export.service.ts`) |
| Tên không phản ánh nội dung | `deduplicate.service.ts` chứa orphan stats + cleanup; `upload.service.ts` khởi tạo `storage` singleton dùng chung cho download/cleanup |
| Tên tốt | `assertStrongPassword`, `superAdminBootstrapService.bootstrapIfEligible`, `oauthHandoffService.issue/consume`, `fileRepository.findOwned` |
| Không nhất quán Anh/Việt trong identifier & message | Message lỗi backend lẫn "Password must be 12+ characters…" và "Mật khẩu hiện tại không chính xác"; FE `sessions` tiếng Anh, còn lại tiếng Việt |
| Enum/const trùng ngữ nghĩa | `Permission` (6 hằng) vs chuỗi literal (26); `jobKeys` định nghĩa 2 lần |

Vì sao quan trọng: tên biến một ký tự chỉ hợp lý trong phạm vi 2–3 dòng. Khi hàm dài 30 dòng (như `mail.controller.sendTemplate`), người đọc phải ghi nhớ `q` là request, `r` là response, `n` là next, `x` là item… làm tăng tải nhận thức không cần thiết.

## 4. Độ phức tạp

| Điểm nóng | Vấn đề |
| --- | --- |
| `file-manager.tsx` (1100 dòng) | 20+ `useState`, 3 tab (1 tab chết), 3 modal, 10 handler, JSX lồng 8–10 cấp |
| `role-manager.tsx` (746) | 3 modal inline với style object dài, logic chọn nhóm permission |
| `jobs-manager.tsx` (740) | form create/edit dùng chung 8 state, 2 modal |
| `markdown-converter.ts` `markdownToGoogleDocsHtml` | Chuỗi `.replace` regex 15 bước; bảng được thay bằng regex dựng động từ header (`new RegExp(\`\\|.*${tbl.headers[0]}…\`)`) — header có ký tự regex đặc biệt (`.`, `(`, `+`) sẽ lỗi hoặc thay sai |
| `markdown-previewer.tsx` `parseMarkdownToElements` | Parser thủ công 300 dòng; mọi dòng list trở thành `<li>` rời không có `<ul>`; blockquote chỉ 1 dòng; đây là "reinvent the wheel" so với `react-markdown` + `remark-gfm` |
| `challenge.service.ts` | Ternary lồng 4 tầng x2 |
| `user.service.ts` | 8 use case, 274 dòng — chưa vượt giới hạn nhưng là ứng viên tách |

## 5. Trùng lặp (DRY)

| Đoạn lặp | Số lần | Vị trí |
| --- | --- | --- |
| `escapeHtml` | 4 | `email-template.service.ts`, `mail.service.ts`, `auth-action.template.ts`, `security-alert.template.ts` |
| Bóc thông báo lỗi `err.response?.data?.error?.message` bằng cast thủ công | ≥12 | `user-list`, `user-detail`, `assign-role-modal`, `role-manager` (x3), `jobs-manager` (x4), `file-manager` (x5), `must-change-password-modal` — trong khi đã có `apiError()` ở `interceptors.ts` |
| `formatSize` | 2 | `file-manager.tsx`, `dashboard/page.tsx` |
| `roleLabel` | 2 | `dashboard-shell.tsx`, `dashboard/page.tsx` |
| Tính `currentMaxRank`/`targetMaxRank` từ `roles` | 5 | `user-list`, `user-detail`, `assign-role-modal`, `role-manager`, `use-permission` |
| Modal overlay + panel với style inline giống nhau | 8 | `user-list`, `assign-role-modal`, `role-manager` (x3), `must-change-password-modal`, `jobs-manager` (x2) |
| Kiểm tra password policy (12 ký tự, hoa/thường/số) | 4 | `password.policy.ts`, `password-reset.schema.ts`, `register/page.tsx`, `forgot-password/page.tsx` (+ `must-change-password-modal` sai thành 8) |
| Danh sách permission | 5 | Xem CODE-002 |
| Gọi `/users/me` khi mount | 2 | `dashboard-shell.tsx`, `dashboard/page.tsx` |

Vì sao quan trọng: trùng lặp policy (mật khẩu) đã tạo ra **mâu thuẫn thực tế** (8 vs 12 ký tự). Trùng lặp bóc lỗi khiến việc đổi format response phải sửa 12 chỗ.

## 6. Coupling và cohesion

- **Coupling cao qua singleton module-level**: `storage` được tạo khi import `upload.service.ts`; `MailService(new SmtpProvider())` được tạo khi import `mail.controller.ts` và `mail-send.job.ts` (tạo transport SMTP ngay cả khi API không gửi mail). Test phải mock ở tầng module (`vi.mock`) thay vì inject.
- **Cross-module import theo đường dẫn sâu**: `users/password/password.service.ts` import `../../auth/sessions/session.repository.js`; `mail/mail.controller.ts` import `../auth/challenges/challenge.service.js`. Không có "public API" (index) cho module → ranh giới module chỉ là thư mục.
- **Cohesion thấp** ở `auth.controller.ts` (17 handler, từ register tới revoke session) và `file-manager.tsx`.
- **Cohesion tốt** ở `oauth/google/*` (self-contained, có docs), `rbac/*`, `email-template.service.ts`.

## 7. Error handling

| Mẫu | Đánh giá | Bằng chứng |
| --- | --- | --- |
| `ApiError(status, code, message, details)` + `errorMiddleware` | Tốt | Chuẩn hóa envelope lỗi đúng spec |
| `try { … } catch (e) { n(e) }` lặp ở mọi handler | Thừa với Express 5 (tự bắt promise reject) nhưng vô hại | Tất cả controller |
| `throw new Error("Lịch trình không tồn tại")` | Sai tầng: client nhận 500 `INTERNAL_ERROR` thay vì 404 | `job.service.ts` x3, `password-reset.service.ts` |
| `catch {}` nuốt lỗi im lặng | Nguy hiểm cho vận hành | `deduplicate.service.ts` cleanup loop; `dashboard-shell.tsx` `.catch(() => {})`; `server.ts` shutdown |
| `catch { res.redirect(...error=…) }` mất thông tin lỗi | Chấp nhận được cho redirect, nhưng không log | `auth.controller.verifyRegistration`, `verifyMagic` |
| `console.error` + `error: any` | Bỏ qua logger có redact | `google-oauth.controller.ts` |
| FE `alert()` cho lỗi | Trải nghiệm kém, không test được | `user-list`, `user-detail`, `role-manager`, `jobs-manager`, `file-manager` |
| FE `try/finally` không `catch` | Lỗi bị nuốt vào interceptor | `settings/page.tsx` |
| `.catch(()=>undefined)` khi ghi audit thất bại | Hợp lý (audit không nên chặn response) nhưng nên log | `mail.controller.ts` |

## 8. Khả năng đọc, bảo trì, mở rộng

- **Đọc**: 40% file không đọc được nếu không format lại. Phần còn lại đọc tốt, có comment tiếng Việt giải thích ý đồ (`maintenance.job.ts`, `file.repository.reuse`).
- **Bảo trì**: Dead code nhiều (CODE-003); tài liệu lệch; không có test bảo vệ hành vi ở tầng route.
- **Mở rộng**: Thêm provider login mới cần sửa `StrategyResult.provider` union + enum Prisma + migration; thêm permission cần sửa 5 nơi; thêm loại job cần sửa `jobsConfig.queues`, `job.registry.ts`, `TASK_TYPE_METADATA`, enum `JobTaskType`, seed, FE type `JobTaskType` — 6 nơi.

## 9. Dấu hiệu over-engineering hoặc code sinh bởi AI thiếu kiểm soát

| Dấu hiệu | Bằng chứng | Vì sao đáng lo |
| --- | --- | --- |
| Tạo file cho đủ danh sách spec, không dùng | `event-bus.ts`, `events.ts`, `transaction.ts`, `status-code.ts`, `MarkdownImporter`, `Button`, `Loading` | Người đọc tưởng có cơ chế event/transaction, thực ra không |
| Nén code để tiết kiệm token/độ dài | 82 file một dòng | Không phải phong cách của người viết tay |
| Checklist tick hàng loạt trước khi xác minh | README tick "db:migrate pass", "PUT roles", "Storage failure handled", "Gỡ trang OTP" | Trái quy tắc trong chính `AGENTS.md` ("Không đánh dấu task chưa được xác minh") |
| Giữ dead code để qua lint | `void TemplateGallery;` trong `mail-manager.tsx`; `void _next;` trong `error.middleware.ts` | Che triệu chứng thay vì xóa |
| Copy pattern sai giữa các module | `file.routes.ts` không authorize → `job.routes.ts` sao chép y hệt | Lỗi lan theo template |
| Text marketing trong UI | "Cơ chế Deduplication thông minh… 0 byte phát sinh", "Trực quan hóa", "Tích hợp Server" | Không sai, nhưng cho thấy ưu tiên "trông có vẻ hoàn thiện" hơn tính đúng |
| Tính năng vượt spec chưa hoàn thiện | Import markdown 202 nhưng không lưu; tab upload chết; `runOnServer` không đọc | Rộng nhưng mỏng |
| Tự viết parser Markdown/Excel thay vì dùng thư viện | `markdown-previewer.tsx`, `markdown-converter.ts` | 900 dòng cần bảo trì, nhiều edge case sai (list không có `<ul>`, regex header bảng) |

Ngược lại, có những chỗ AI (hoặc người) đã làm **đúng và cẩn thận**: advisory lock bootstrap, one-time handoff, escape biến template, `LocalStorage.safe()` chống traversal, race hai upload cùng hash. Bài học không phải "AI viết code tệ", mà là **code sinh ra cần một quy trình kiểm soát (format, lint, test theo route, review diff) mà dự án này chưa có**.

## 10. Khuyến nghị nhanh về chất lượng code

1. Prettier toàn repo (một commit riêng), bật `max-lines: 400`, `max-len: 140` ở ESLint.
2. Bật `noUnusedLocals`, `noUnusedParameters`; chạy `knip` để liệt kê dead code.
3. Tạo `frontend/src/lib/api/error.ts` với `getApiErrorMessage(err)` và thay 12 chỗ bóc lỗi thủ công.
4. Tạo `frontend/src/components/ui/modal.tsx` dùng chung; tách các modal ra file riêng.
5. Chuyển 3 policy mật khẩu về một schema Zod dùng chung trong mỗi app (backend `password.policy.ts` là nguồn, FE tự định nghĩa nhưng copy đúng hằng số 12).
6. Dùng `react-markdown` + `remark-gfm` thay parser thủ công; giữ callout bằng plugin nhỏ.
