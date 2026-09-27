# Skill: Refactor Backend theo hướng đơn giản hóa và đúng layer

Dùng skill này khi module backend:

- khó truy vết,
- bị chia quá nhỏ,
- có abstraction dư thừa,
- controller đang chứa validation/business error,
- route chứa domain logic,
- service chỉ pass-through,
- error handling bị lặp trong từng module.

Mục tiêu là giảm indirection và đưa logic về đúng layer nhưng không thay đổi:

- business behavior,
- security behavior,
- API contract,
- error contract,
- database contract.

Khi task có liên quan đến test (thêm, sửa, di chuyển, xóa hoặc đánh giá test), đọc và tuân thủ:

`.agents/skills/testing/SKILL.md`

---

## Bước 1 — Trace trước khi refactor

Ghi request flow hiện tại:

```text
METHOD /path
→ route
→ middleware
→ controller
→ helper
→ service
→ repository
→ adapter
→ Prisma
→ response
```

Ghi error flow hiện tại:

```text
error condition
→ layer nào phát hiện
→ layer nào format
→ layer nào trả response
```

Liệt kê toàn bộ file tham gia.

---

## Bước 2 — Audit layer responsibility

### Route

Kiểm tra route có đang:

- gọi service,
- gọi Prisma,
- chứa business rule,
- chứa domain authorization phức tạp,
- trả domain error.

Nếu có, đánh dấu để di chuyển về layer phù hợp.

### Validation

Kiểm tra:

- schema đã validate body/params/query chưa,
- controller có validate lại không,
- controller có manual `typeof`, empty check, enum check trùng schema không.

Nếu validation đã có ở middleware, xóa validation lặp ở controller.

### Controller

Kiểm tra controller có đang:

- gọi Prisma,
- xử lý business rule,
- quyết định not-found/conflict,
- trả JSON error thủ công,
- `try/catch` AppError chỉ để format response,
- gọi nhiều service không cần thiết.

Controller mục tiêu:

```text
validated input
→ service
→ success response
```

### Service

Kiểm tra service có đang:

- chỉ forward sang repository,
- trả `null/false` để controller tự quyết định domain error,
- thiếu business/domain condition đáng lẽ thuộc service,
- phụ thuộc Express.

Service mục tiêu:

```text
use case
→ business/domain rule
→ Prisma/repository
→ return result
```

Known domain error:

```text
throw AppError
```

### Error handling

Kiểm tra module có đang duplicate:

```text
response.status(...).json({
  success: false,
  error: ...
})
```

Nếu global error handler đã có convention tương ứng, đưa error creation về đúng layer và để global handler format response.

---

## Bước 3 — Đánh dấu VALUE hoặc PASS-THROUGH

Một layer/function có VALUE khi thêm ít nhất một trong:

- business rule,
- authorization,
- validation responsibility,
- meaningful mapping,
- transaction,
- integration boundary,
- persistence complexity,
- error/domain responsibility,
- reusable capability độc lập.

PASS-THROUGH khi chủ yếu:

```text
nhận input
→ gọi layer tiếp theo
→ trả nguyên kết quả
```

Không xóa layer chỉ vì ít dòng nếu nó vẫn có boundary responsibility thật.

Ví dụ controller mỏng vẫn có giá trị vì là HTTP boundary.

---

## Bước 4 — Tìm candidate đơn giản hóa

Kiểm tra:

- repository một dòng,
- interface một implementation,
- mapper một lần,
- adapter một lần,
- wrapper service,
- helper file không có responsibility,
- DTO/input lặp schema,
- controller validate lại input,
- controller tự trả domain error,
- route chứa domain business rule,
- error formatter lặp,
- test mock abstraction đã không còn cần.

---

## Bước 5 — Flow mục tiêu

Ưu tiên:

```text
route
→ middleware
→ controller
→ service
→ Prisma
→ response
```

Khi có lỗi:

```text
service / middleware
→ throw AppError
→ global errorHandler
→ error response
```

Repository chỉ nằm giữa service và Prisma nếu có persistence responsibility thật.

---

## Bước 6 — Validation refactor

Nếu schema/middleware đã validate:

- bỏ validation lặp khỏi controller,
- dùng validated input type theo convention hiện tại,
- không thay đổi API validation contract.

Nếu schema còn thiếu validation thật:

- bổ sung vào schema,
- gắn validation ở route,
- không vá bằng manual check trong controller.

---

## Bước 7 — Domain error refactor

Nếu controller đang làm:

```ts
const result = await service();

if (!result) {
  response.status(404).json(...);
  return;
}
```

hãy xác định:

- `not found` có phải domain/business error không?
- service có phải layer biết condition này rõ nhất không?

Nếu có:

```ts
service
→ throw AppError(...)
```

Controller chỉ xử lý success.

Không thay đổi status/code/message contract khi refactor.

---

## Bước 8 — Merge abstraction có kiểm soát

Ưu tiên merge:

- repository pass-through vào service,
- mapper dùng một lần vào service/controller phù hợp,
- private helper file nhỏ vào owner,
- input type lặp vào schema-derived type.

Không merge các business capability khác nhau thành giant service.

---

## Bước 9 — Middleware và authorization

Simple gate có thể giữ ở middleware:

- authenticated?
- có role/permission cơ bản?

Domain authorization phải vào service:

- ownership,
- actor-target relationship,
- invariant nghiệp vụ,
- trạng thái resource,
- rule phụ thuộc database/domain.

Không di chuyển simple security gate khỏi middleware nếu không có lý do.

---

## Bước 10 — Giữ nguyên contract

Không đổi nếu task không yêu cầu:

- API path,
- response shape,
- validation behavior,
- HTTP status,
- error code/message,
- auth/security behavior,
- database schema,
- transaction semantics.

---

## Bước 11 — Test

Nếu refactor làm thay đổi test seam:

- cập nhật test hiện có,
- không giữ mock abstraction đã bị xóa,
- không tạo test duplicate,
- tuân thủ `.agents/skills/testing/SKILL.md`.

Nếu refactor không đổi behavior và test hiện tại đã bảo vệ đủ contract, không bắt buộc thêm test mới.

---

## Bước 12 — Chỉ refactor flow mục tiêu

Không dọn toàn repository.

Nếu module khác có cùng vấn đề, ghi vào out-of-scope.

---

## Bước 13 — Verification

Chạy lệnh phù hợp:

```text
lint
typecheck
test liên quan
build nếu cần
git diff --check
```

Báo rõ command đã/chưa chạy và lý do.

---

## Bước 14 — Báo cáo cuối

```text
## Trước khi refactor
<request flow cũ>

## Sau khi refactor
<request flow mới>

## Error flow trước
...

## Error flow sau
...

## Layer responsibility đã điều chỉnh
- validation:
- route:
- controller:
- service:
- error handler:

## Indirection đã loại bỏ
- ...

## Abstraction giữ lại
- abstraction + lý do

## File đã thay đổi

## Test đã thêm/cập nhật

## Verification

## Vấn đề ngoài scope
```
