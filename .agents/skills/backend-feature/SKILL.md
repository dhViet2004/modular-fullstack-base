# Skill: Triển khai Backend Feature

Dùng skill này khi tạo mới hoặc mở rộng endpoint/feature backend.

Mục tiêu là triển khai feature theo flow rõ ràng:

```text
route
→ middleware
→ controller
→ service
→ Prisma
→ response
```

Lỗi đi theo:

```text
middleware / controller / service
→ throw
→ global errorHandler
→ error response
```

Repository chỉ thêm khi có lý do thật.

---

## Bước 1 — Đọc rule

Đọc:

1. `AGENTS.md`
2. `.agents/roles/backend.md`
3. các file liên quan trực tiếp đến feature
4. docs liên quan
5. test liên quan
6. global validation middleware
7. global error handler

Khi task có liên quan đến test (thêm, sửa, di chuyển, xóa hoặc đánh giá test), đọc và tuân thủ:

`.agents/skills/testing/SKILL.md`

Không đọc lan sang module không liên quan nếu task không phụ thuộc.

---

## Bước 2 — Xác định use case

Ghi rõ:

```text
Feature:
Endpoint:
Input:
Output:
Authentication:
Authorization:
Validation:
Business rules:
Domain errors:
Persistence:
Integration:
```

Phân biệt rõ:

- input validation,
- HTTP concern,
- domain/business rule,
- persistence concern.

---

## Bước 3 — Trace flow hiện tại

Tìm:

```text
route
→ middleware
→ controller
→ service
→ Prisma/repository
→ response
```

Và error flow:

```text
throw
→ global errorHandler
→ HTTP error response
```

Không bắt đầu code khi chưa hiểu hai flow này.

---

## Bước 4 — Cấu trúc mặc định

Ưu tiên:

```text
<feature>.routes.ts
<feature>.controller.ts
<feature>.service.ts
<feature>.schema.ts
```

Không tự động tạo:

```text
repository
mapper
adapter
factory
policy
types
helper
```

Nếu chưa có responsibility riêng.

---

## Bước 5 — Route

Route chỉ:

- method,
- URL,
- auth middleware,
- authorization middleware,
- validation middleware,
- controller.

Simple role gate có thể nằm ở middleware.

Domain authorization phức tạp phải nằm trong service.

Route không được:

- gọi service trực tiếp,
- gọi Prisma,
- trả domain error,
- chứa use-case orchestration.

---

## Bước 6 — Schema và validation

Schema định nghĩa:

- params,
- query,
- body,
- request input type khi phù hợp.

Validation phải chạy trước controller.

Controller không validate lại dữ liệu đã được middleware validate.

Không viết manual check kiểu:

```ts
if (typeof request.params.id !== "string") {
  ...
}
```

nếu schema đã chịu trách nhiệm.

Nếu project có `ValidatedRequest`, ưu tiên sử dụng đúng convention hiện tại.

---

## Bước 7 — Controller

Controller chỉ:

```text
validated input
→ auth context nếu cần
→ service use case
→ success response
```

Không đặt trong controller:

- Prisma,
- business rule,
- not-found business condition,
- conflict business condition,
- manual validation đã có schema,
- domain authorization,
- manual JSON error formatting,
- `try/catch` chỉ để convert AppError thành response.

Ví dụ target:

```ts
async setAdminRole(request, response) {
  const { userId } = request.params;
  const { enabled } = request.body;

  await userService.setAdminRole(userId, enabled);

  response.json(successResponse({ enabled }));
}
```

---

## Bước 8 — Service

Service chịu trách nhiệm:

- business rule,
- domain authorization,
- ownership,
- not-found/conflict,
- state transition,
- transaction,
- Prisma,
- integration orchestration.

Known domain error phải throw `AppError` theo convention project.

Ví dụ:

```ts
if (!user) {
  throw new AppError(
    404,
    "USER_NOT_FOUND",
    "Không tìm thấy user",
  );
}
```

Không trả sentinel như `null`, `false`, `undefined` cho controller chỉ để controller quyết định domain error nếu service đã biết chính xác lỗi.

Chỉ trả nullable result nếu `not found` thực sự là một kết quả hợp lệ của use case.

---

## Bước 9 — Global error handler

Không tạo error formatter riêng trong feature nếu global `errorHandler` đã xử lý.

Giữ nguyên:

- status code,
- error code,
- message,
- response shape.

Nếu feature cần error mới, dùng error convention hiện tại của project.

---

## Bước 10 — Response mapping

Mapping nhỏ, thuần HTTP presentation có thể ở controller.

Mapping public model có thể ở service nếu:

- tránh lộ DB shape,
- được reuse,
- làm controller rõ hơn.

Không tạo mapper file chỉ cho một mapping đơn giản dùng một lần.

---

## Bước 11 — Repository

Mặc định service gọi Prisma trực tiếp.

Chỉ thêm repository khi có lý do cụ thể:

- query phức tạp,
- query reuse,
- persistence mapping,
- nhiều persistence implementation,
- persistence responsibility độc lập.

Không thêm repository vì pattern.

---

## Bước 12 — Test

Nếu behavior/API/security/validation/domain error thay đổi:

- cập nhật test có giá trị,
- tuân thủ `.agents/skills/testing/SKILL.md`,
- không test implementation detail,
- không tạo test chỉ để tăng coverage.

Ưu tiên test:

- validation contract,
- auth/authorization behavior,
- domain error,
- state transition,
- response contract,
- regression bug.

---

## Bước 13 — Verification

Chạy lệnh phù hợp:

```bash
pnpm --filter backend lint
pnpm --filter backend typecheck
pnpm --filter backend test
pnpm --filter backend build
```

Và:

```bash
git diff --check
```

Không báo pass nếu chưa chạy.

---

## Bước 14 — Báo cáo cuối

```text
## File đã thay đổi

## Request flow

## Error flow

## Layer responsibility
- validation:
- controller:
- service:
- error handler:
- response mapping:

## Abstraction
- thêm/xóa gì
- lý do

## Test đã thêm/cập nhật

## Verification

## Vấn đề ngoài scope
```
