---
name: testing
description: Quy tắc tổ chức và viết test khi tạo feature, sửa bug, refactor hoặc thay đổi behavior, API, validation, security, schema hay persistence. Dùng để giữ test gọn, có giá trị và không làm module bị lẫn source với test.
---

# Skill: Testing thực dụng

Đọc `AGENTS.md` trước và tuân thủ toàn bộ rule về scope, architecture, security và verification.

## 1. Mục tiêu

Test phải bảo vệ behavior quan trọng của project.

Không viết test chỉ để tăng số lượng test hoặc coverage.

Ưu tiên test:

- business rule,
- security behavior,
- authorization,
- validation,
- API contract,
- error contract,
- persistence behavior quan trọng,
- regression của bug đã sửa,
- flow có rủi ro cao.

Không ưu tiên test các chi tiết implementation không ảnh hưởng behavior bên ngoài.

---

## 2. Test phải nằm trong folder riêng

Không đặt file test xen kẽ với source file trong module.

Không ưu tiên:

```text
users/
├── user.routes.ts
├── user.routes.test.ts
├── user.controller.ts
├── user.service.ts
├── user.service.test.ts
└── user.schema.ts
```

Ưu tiên:

```text
users/
├── user.routes.ts
├── user.controller.ts
├── user.service.ts
├── user.schema.ts
└── tests/
    ├── user.routes.test.ts
    └── user.service.test.ts
```

Hoặc nếu repository đang dùng convention `__tests__` ổn định:

```text
users/
└── __tests__/
```

Không tự tạo cả `tests/` và `__tests__/` trong cùng project.

Mặc định dùng convention hiện có của project.

Nếu project chưa có convention rõ ràng, dùng:

```text
<feature>/tests/
```

Không di chuyển toàn bộ test của repository chỉ vì một task nhỏ.

Khi đang sửa một module, chỉ chuẩn hóa test của module đó nếu việc di chuyển không làm mở rộng scope quá mức.

---

## 3. Chỉ test những behavior cần thiết

Trước khi tạo test mới, hỏi:

1. Test này bảo vệ behavior gì?
2. Behavior đó có business/security/API value không?
3. Nếu test này không tồn tại, bug nào có thể lọt qua?
4. Behavior này đã được test ở layer khác chưa?
5. Test này có đang kiểm tra implementation detail không?

Nếu không trả lời được rõ ràng, không tạo test.

---

## 4. Không test framework hoặc thư viện thay project

Không viết test chỉ để chứng minh:

- Express gọi middleware theo API chuẩn,
- Zod tự reject dữ liệu sai theo behavior mặc định của Zod,
- Prisma gọi đúng method chỉ vì code có đúng một dòng,
- JavaScript/TypeScript built-in hoạt động,
- library bên thứ ba hoạt động đúng tài liệu.

Chỉ test phần project tự định nghĩa:

- schema business constraint,
- mapping error,
- authorization rule,
- response contract,
- transaction/persistence semantics,
- behavior kết hợp nhiều thành phần.

---

## 5. Không test pass-through layer nếu không có behavior

Ví dụ function:

```ts
async function getUserById(id: string) {
  return prisma.user.findUnique({ where: { id } });
}
```

Nếu function không có business rule, mapping, error contract hoặc branching riêng thì không bắt buộc tạo unit test chỉ cho function đó.

Test ở layer cao hơn nếu behavior thật sự cần được bảo vệ.

---

## 6. Test theo mức độ giá trị

### Bắt buộc cân nhắc test

Khi thay đổi:

- authentication,
- authorization,
- role/permission,
- validation có business meaning,
- token/session,
- password,
- security,
- API response shape,
- error code/status,
- transaction,
- state transition,
- database mutation quan trọng,
- bug regression.

### Có thể không cần test mới

Khi thay đổi:

- rename nội bộ không đổi behavior,
- refactor pass-through layer,
- di chuyển private helper,
- format code,
- đổi comment,
- đổi tên biến,
- thay implementation nhưng test hiện tại đã bảo vệ đầy đủ behavior.

Trong trường hợp refactor không đổi behavior:

- ưu tiên cập nhật test hiện có nếu test seam thay đổi,
- không tạo thêm test trùng lặp chỉ vì code vừa được refactor.

---

## 7. Không duplicate test giữa nhiều layer

Không test cùng một behavior đầy đủ ở:

```text
route test
+ controller test
+ service test
+ repository test
```

nếu không có lý do rõ ràng.

Ví dụ:

Business rule:

```text
chỉ SUPER_ADMIN được đổi role ADMIN
```

Có thể được bảo vệ bằng:

- route/integration test cho authorization flow,
- service test nếu service chứa domain authorization.

Không cần copy cùng toàn bộ case sang mọi layer.

---

## 8. Route/API test

Route test nên tập trung vào:

- authentication,
- authorization,
- validation wiring,
- HTTP status,
- response shape,
- error contract,
- endpoint integration quan trọng.

Không cần test từng dòng controller.

Ví dụ nên test:

```text
GET /api/users
- unauthenticated → 401
- thiếu permission → 403
- thành công → đúng response shape
```

Không cần test riêng việc controller gọi `res.json()` nếu integration test đã bảo vệ response.

---

## 9. Service test

Service test nên tập trung vào:

- business rule,
- normalization,
- branching,
- domain error,
- transaction behavior,
- persistence semantics quan trọng,
- integration orchestration.

Không test private helper trực tiếp.

Test thông qua public use case.

---

## 10. Regression test cho bug

Khi sửa bug:

1. Xác định behavior gây bug.
2. Thêm hoặc cập nhật test để tái hiện bug nếu hợp lý.
3. Sửa code.
4. Xác nhận test pass.

Không cần tạo regression test nếu bug hoàn toàn nằm ở config/environment và không thể test ổn định trong test suite hiện tại.

Nếu không thêm regression test, phải ghi rõ lý do trong báo cáo.

---

## 11. Test naming

Tên test phải mô tả behavior.

Ưu tiên:

```text
returns 403 when actor lacks USERS_READ
returns USER_NOT_FOUND when target user does not exist
normalizes email before lookup
removes ADMIN role when enabled is false
```

Không dùng tên mơ hồ:

```text
works
test1
should pass
handles data
```

---

## 12. Mock tối thiểu

Chỉ mock boundary cần thiết.

Ưu tiên mock:

- Prisma client khi unit test service,
- external email provider,
- storage provider,
- OAuth provider,
- clock/randomness khi behavior phụ thuộc chúng.

Không mock quá sâu toàn bộ call chain.

Không tạo mock repository chỉ để giữ một architecture đã bị loại bỏ.

---

## 13. Không tạo test helper sớm

Không tạo:

```text
test-utils/
factories/
builders/
fixtures/
mocks/
```

chỉ vì có vài dòng setup lặp lại.

Chỉ tách test helper khi:

- được dùng ở nhiều test file,
- setup đủ phức tạp,
- việc tách làm test dễ đọc hơn rõ ràng.

Test code cũng phải tuân thủ KISS và YAGNI.

---

## 14. Scope test theo task

Khi task sửa một feature:

- chạy test liên quan trước,
- sau đó chạy suite rộng hơn nếu cần,
- không sửa test module khác nếu không bị ảnh hưởng,
- không rewrite toàn bộ test architecture.

Nếu command test toàn project rẻ và ổn định, có thể chạy toàn bộ trước khi hoàn thành.

---

## 15. Verification

Tối thiểu chạy test phù hợp với phần thay đổi.

Ví dụ backend:

```bash
pnpm --filter backend test
pnpm --filter backend typecheck
pnpm --filter backend lint
```

Nếu task ảnh hưởng build/runtime contract:

```bash
pnpm --filter backend build
```

Cuối cùng:

```bash
git diff --check
```

Không báo pass nếu chưa chạy.

---

## 16. Báo cáo test bắt buộc

Trong final report phải nêu:

```text
## Test đã thêm/cập nhật

- file
- behavior được bảo vệ

## Test không thêm và lý do

- nếu refactor không đổi behavior và test hiện tại đã đủ

## Verification

- command
- kết quả
```

Không lấy số lượng test làm tiêu chí chất lượng.

---

# Nguyên tắc cuối

Test behavior, không test implementation.

Chỉ viết test có khả năng bắt lỗi thực tế hoặc bảo vệ contract quan trọng.

Giữ test trong folder riêng của feature để source code dễ đọc và dễ truy vết.
