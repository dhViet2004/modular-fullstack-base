# 13. Nhận xét dành cho học viên

Phần này viết dưới góc nhìn của người thầy. Tôi sẽ thẳng thắn, nhưng mọi nhận xét đều có bằng chứng ở các báo cáo trước; em có thể mở từng mã lỗi để đối chiếu.

## 1. Những điểm em đã làm tốt

1. **Em hiểu đúng bài toán xác thực ở mức thiết kế.** Một pipeline chung cho mọi cách đăng nhập (`authService.complete`), tách `PasswordCredential` khỏi `User`, `AuthIdentity` đa provider, `VerificationChallenge` dùng chung cho OTP/magic link/verify/reset — đây là mô hình mà nhiều hệ thống thật đang dùng. Em đã không "tạo user riêng cho mỗi phương thức login", đúng như spec cảnh báo.
2. **Em nghĩ đến race condition trước khi nó xảy ra.** Advisory lock cho bootstrap SUPER_ADMIN, `updateMany where consumedAt null` để bảo đảm one-time-use, bắt unique conflict khi hai upload cùng hash. Rất ít học viên tự làm được điều này. Hãy giữ thói quen tự hỏi: "nếu hai request này đến cùng lúc thì sao?"
3. **Em không đưa bí mật ra ngoài ở những chỗ dễ sai nhất.** Token vào DB chỉ dưới dạng hash; OAuth không đưa token vào URL mà dùng handoff code; `select` bỏ `refreshTokenHash` khi trả session; mask SMTP user, không trả password.
4. **Mô hình `File`/`StoredObject` với reference count** là một thiết kế trưởng thành: tách logic khỏi vật lý, cho phép dedup và "dùng lại 0 byte".
5. **Cấu trúc thư mục** cả hai phía đều đúng hướng: module hoá backend, feature-based frontend, có repository/service/controller, có policy tách riêng và có test cho policy.
6. **Em viết test cho những bất biến quan trọng** (hash-only, one-time, session limit, revoke tức thì) chứ không chỉ test "hàm trả về đúng".

## 2. Những tư duy đúng cần phát huy

- **Tư duy "bất biến" (invariant)**: "chỉ có một SUPER_ADMIN", "challenge chỉ dùng một lần", "object vật lý chỉ xoá khi refCount = 0" — em đã nghĩ theo bất biến và bảo vệ chúng bằng transaction/lock/test. Hãy mở rộng tư duy này sang phân quyền: "mọi route đều phải khai báo quyền" cũng là một bất biến.
- **Tư duy hàng đợi**: gửi mail qua job thay vì gọi SMTP trong request (đúng ở auth/users; sai ở `mail.controller`). Tiếp tục áp dụng nhất quán.
- **Tư duy abstraction có mục đích**: `StorageDriver`, `MailProvider` là abstraction đúng vì có ≥2 implementation hoặc cần mock. Ngược lại, `eventBus`, `transaction.ts` là abstraction không có mục đích. Hãy chỉ tạo abstraction khi có lý do cụ thể.

## 3. Những lỗi mang tính hệ thống cần thay đổi

Tôi gọi là "hệ thống" vì chúng không phải lỗi typo; chúng lặp lại theo cùng một cách nghĩ.

### 3.1 "Xong tính năng" được hiểu là "UI chạy được với tài khoản admin"

- Jobs và Files API không kiểm tra quyền (SEC-001, SEC-002); `PATCH /users/:id` bỏ qua policy (SEC-007). Cả ba đều "chạy được" khi em test bằng tài khoản SUPER_ADMIN trên UI, vì UI ẩn menu theo quyền. Em đã tin vào lớp ẩn/hiện của frontend — thứ mà spec nhắc rõ "Backend luôn là nơi authorization cuối cùng".
- Cách sửa tư duy: mỗi khi thêm route, hãy viết ngay test "user không có quyền → 403" trước khi viết test "admin → 200". Bảng ma trận route × vai trò là công cụ bắt buộc.

### 3.2 Tick checklist thay cho xác minh

- README tick "`db:migrate` pass" trong khi migration không có bảng `ScheduledJob`; tick "PUT roles" trong khi CORS chặn PUT; tick "Storage failure handled" mà không có test; tick "gỡ trang OTP" mà file còn nguyên. `AGENTS.md` do chính dự án viết ra yêu cầu "Không đánh dấu task chưa được xác minh", nhưng quy trình không có gì cưỡng chế điều đó.
- Cách sửa tư duy: một mục chỉ được tick khi có **bằng chứng tự động** (test, CI) — không phải khi "mình nhớ là đã chạy". Nếu chưa có CI, hãy ghi rõ "đã chạy tay ngày X, output …".

### 3.3 Nhìn từng file, không nhìn toàn luồng

- Backend làm rotation refresh token đúng; frontend không dedupe refresh → người dùng bị logout ngẫu nhiên (ERR-003). Backend trả 401 đúng chuẩn; frontend coi mọi 401 là hết hạn → sai mật khẩu bị reload (ERR-002). Cleanup xoá file rồi mới xử lý DB (ERR-005). Đăng ký → link hết hạn → không có lối ra (ERR-006).
- Mỗi mảnh riêng lẻ có vẻ hợp lý; lỗi chỉ hiện ra khi đi hết một luồng từ trình duyệt đến DB và quay lại. Cách sửa tư duy: với mỗi tính năng, vẽ (hoặc viết) sequence diagram end-to-end và hỏi "ở bước này nếu lỗi thì người dùng thấy gì, dữ liệu ở trạng thái nào".

### 3.4 Sao chép mẫu sai

- `file.routes.ts` thiếu authorize → `job.routes.ts` sao chép y hệt. `PERMISSION_GROUPS`, danh sách permission trong seed, trong constants, trong nav… mỗi nơi một bản. Ba nơi kiểm tra mật khẩu, một nơi sai (8 thay vì 12).
- Cách sửa tư duy: khi copy một khối code lần thứ hai, dừng lại và hỏi "nguồn sự thật của thứ này ở đâu?". Nếu chưa có, tạo nó.

### 3.5 Code không được viết cho người đọc

- 82/207 file viết trên một dòng, có dòng 3.869 ký tự. Dù nguyên nhân là công cụ sinh code, việc chấp nhận commit chúng là một quyết định. Code như vậy không review được, không diff được, không debug được theo dòng. Đây là vấn đề lớn nhất về chất lượng vì nó chặn mọi cải thiện khác.
- Cách sửa tư duy: format là bước bắt buộc trước commit (Prettier + lint-staged), giống như rửa tay trước khi ăn — không phải việc "làm sau".

### 3.6 Tin vào dữ liệu từ request để dựng thứ nhạy cảm

- Link magic link dựng từ `Host` header (SEC-003). Nguyên tắc: URL công khai, secret, callback… luôn đến từ cấu hình, không bao giờ từ request.

## 4. Những kiến thức em đang thiếu

| Kiến thức | Biểu hiện trong dự án |
| --- | --- |
| Hành vi trình duyệt với CORS preflight | ERR-001 |
| Vòng đời request trong Express/multer (body được đọc khi nào, bộ nhớ ở đâu) | SEC-004 |
| Prisma migration workflow (`migrate dev` vs `db push`, drift) | DB-001 |
| Chữ ký API của thư viện đang dùng (pg-boss handler nhận mảng) | ERR-004 |
| Host header attacks, password-reset poisoning | SEC-003 |
| Mẫu "single-flight" cho refresh token ở client | ERR-003 |
| Vòng đời trạng thái in-memory và cleanup theo TTL | SEC-005 |
| Nguyên tắc "DB trước, side effect sau" và saga/compensation đơn giản | ERR-005 |
| Cấu hình môi trường theo cấp (dev/prod), fail-fast | SEC-006 |
| Docker build-arg vs runtime env, đặc thù `NEXT_PUBLIC_*` | OPS-001 |
| Quy tắc phân quyền có thể uỷ quyền (chỉ cấp quyền mình có) | mục 2.3 báo cáo 08 |
| Hydration trong React Server Components (không đọc `localStorage` trong render) | ERR-015 |

## 5. Thứ tự kiến thức cần học bổ sung

1. **Kỷ luật công cụ**: Prettier, ESLint rule `max-lines`, lint-staged, một pipeline CI đơn giản. Học trước vì nó làm mọi bài học sau dễ nhìn thấy.
2. **Authorization end-to-end**: viết ma trận route × vai trò, test tham số hoá với supertest. Đọc OWASP "Broken Access Control".
3. **HTTP và trình duyệt**: CORS (preflight, methods, credentials), Host header, cookie vs localStorage, Content-Disposition. Đọc MDN CORS + OWASP "Unvalidated Redirects / Host header".
4. **Vòng đời request trong Node**: stream vs buffer, multer limits, backpressure. Thử tự upload 1GB vào server local và xem RSS bằng `process.memoryUsage()`.
5. **Prisma migration và chiến lược expand/contract**; tập chạy `migrate diff` trong CI.
6. **Client auth state**: single-flight refresh, phân biệt 401 "chưa xác thực" và 401 "sai thông tin" (cân nhắc backend trả 400/422 cho sai OTP), AuthProvider context.
7. **Thiết kế job/queue**: idempotency, retry/backoff, dead-letter, payload tối thiểu (id thay vì dữ liệu), scheduler key.
8. **Vận hành**: structured logging, health/readiness, backup/restore, `TRUST_PROXY`.
9. **Đọc tài liệu thư viện trước khi dùng API** (pg-boss `work`, `cors` options, `express-rate-limit` validation). Nhiều lỗi ở đây đến từ đoán API.

## 6. Bài học quan trọng rút ra từ dự án

1. **Rộng không thay được đúng.** Dự án có trình soạn LMS chuyển đổi Excel/Google Docs, template editor, jobs UI — rất ấn tượng — nhưng một migration thiếu làm toàn bộ không deploy được. Một base project cần 20 thứ đúng hơn 60 thứ gần đúng.
2. **Frontend ẩn nút không phải là phân quyền.** Câu này em đã biết (spec viết), nhưng code cho thấy chưa thành phản xạ.
3. **Test đơn vị không bắt được lỗi lắp ráp.** Bộ test hiện tại tốt ở tầng service/policy và gần như trống ở tầng route — đúng chỗ các lỗi Critical/High nằm.
4. **Code sinh bởi AI cần quy trình kiểm soát chặt hơn code viết tay, không phải lỏng hơn.** Công cụ tạo ra nhiều code nhanh, kéo theo nhiều dead code, pattern sai được nhân bản, và checklist tự tick. Người dùng công cụ phải là người đặt format, lint, test và review làm rào chắn.
5. **Đọc lại chính tài liệu mình viết.** `docs/architecture/jobs.md` nói scheduler ở worker; `server.ts` làm ngược lại. Tài liệu sai còn hại hơn không có tài liệu.

## 7. Đánh giá tổng thể

| Tiêu chí | Điểm (thang 10) | Nhận xét ngắn |
| --- | --- | --- |
| Hiểu bài toán & thiết kế miền (auth, RBAC, files) | 8 | Mô hình đúng, có chiều sâu |
| Kiến trúc & tổ chức code | 6 | Đúng hình, sai kỷ luật (controller gọi Prisma, vòng phụ thuộc, catalog rải rác) |
| Tính đúng đắn | 4 | 2 Critical, 8 High; nhiều tính năng "chạy" nhưng luồng end-to-end hỏng |
| Bảo mật | 5 | Nền auth tốt; phân quyền thiếu ở 2/6 router; Host header; secret default |
| Chất lượng code | 3 | 40% file không đọc được; 5 file > 500 dòng; dead code |
| Kiểm thử | 5 | Có, đúng chỗ khó; thiếu ở bề mặt API và FE |
| Tài liệu & tính trung thực của checklist | 3 | Nhiều mục tick sai; docs mâu thuẫn |
| Triển khai & vận hành | 3 | Migration thiếu, Dockerfile chưa dùng được, không CI/log/alert |
| **Trung bình có trọng số** | **~4.6** | |

**Kết luận thẳng thắn**: đây là một dự án có **nền tư duy tốt hơn mức trung bình** nhưng **thực thi chưa đạt chuẩn để gọi là "base project tái sử dụng"**. Điều đáng mừng là các lỗi nghiêm trọng nhất đều **sửa nhanh** (nhóm 1 trong lộ trình ~4–5 ngày) và không đòi hỏi viết lại. Điều đáng lo là các lỗi đó xuất phát từ thói quen (không test authorize, tick trước khi verify, không format) — nếu không đổi thói quen, dự án tiếp theo sẽ lặp lại đúng những lỗi này với bộ mặt khác.

Tôi khuyên em làm ba việc theo thứ tự: (1) format toàn bộ repo và dựng CI trong một ngày; (2) viết ma trận test authorize rồi sửa cho pass; (3) đi lại toàn bộ luồng đăng ký → đăng nhập → hết hạn token → refresh → đổi mật khẩu bằng chính tay mình trên trình duyệt với DevTools mở. Sau ba việc đó, em sẽ nhìn dự án này bằng con mắt khác — và đó mới là mục tiêu của bài tập.
