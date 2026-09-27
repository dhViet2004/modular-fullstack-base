# Quy tắc kỹ thuật cho AI Agent

> Đây là nguồn quy tắc chính của repository.
> Mọi AI agent phải đọc file này trước khi tạo hoặc sửa code.

## 1. Thứ tự ưu tiên

Khi các quy tắc xung đột, ưu tiên theo thứ tự:

1. Đúng business logic.
2. Đúng security.
3. Đúng trách nhiệm của từng layer.
4. Request flow rõ ràng, dễ truy vết.
5. Chỉ dùng abstraction thật sự cần thiết.
6. Ít file hơn nhưng không đánh đổi tính rõ ràng.

Mục tiêu không phải viết ít dòng code nhất.

Mục tiêu là để mỗi request dễ hiểu, dễ debug và dễ truy vết.

## 2. Nguyên tắc cốt lõi

Áp dụng KISS, YAGNI và DRY một cách thực tế.

### KISS

Chọn cách triển khai đơn giản nhất nhưng vẫn đáp ứng đúng requirement hiện tại.

Không thêm architecture chỉ để code trông "enterprise", "clean" hoặc "scalable".

### YAGNI

Không tạo abstraction, feature, interface, adapter, factory, repository, mapper, policy hoặc helper cho nhu cầu tương lai chưa tồn tại.

### DRY

Tránh lặp lại business rule quan trọng.

Không tạo abstraction chỉ để loại bỏ vài dòng code giống nhau nếu abstraction đó làm request flow khó hiểu hơn.

## 3. Kiến trúc backend mặc định

Request flow mặc định:

```text
request
→ route
→ middleware nếu cần
→ controller
→ service
→ Prisma
→ response
```

Repository là OPTIONAL, không phải mặc định.

Chỉ dùng repository khi có lý do cụ thể như:

- query persistence phức tạp,
- query được dùng lại ở nhiều service,
- mapping persistence đáng kể,
- có database-specific logic cần tách riêng,
- thật sự cần mock persistence độc lập,
- đã có nhiều persistence implementation,
- transaction đủ lớn và mang trách nhiệm persistence rõ ràng.

Không tạo repository chỉ để bọc một Prisma call đơn giản.

## 4. Cấu trúc module backend mặc định

Bắt đầu từ cấu trúc nhỏ nhất cần thiết:

```text
backend/src/modules/<feature>/
├── <feature>.routes.ts
├── <feature>.controller.ts
├── <feature>.service.ts
└── <feature>.schema.ts
```

Chỉ thêm file khi feature hiện tại có một trách nhiệm độc lập thật sự.

Ví dụ file bổ sung hợp lý:

```text
session.service.ts
google-oauth.service.ts
email.service.ts
storage.service.ts
```

Chỉ dùng khi chúng đại diện cho business capability hoặc infrastructure capability riêng.

Không tạo trước các file như:

```text
<feature>.repository.ts
<feature>.mapper.ts
<feature>.policy.ts
<feature>.types.ts
<feature>.adapter.ts
<feature>.factory.ts
```

nếu chưa có nhu cầu cụ thể.

## 5. Đặt code cùng feature gần nhau

Code của cùng một feature phải nằm gần nhau.

Ưu tiên:

```text
modules/auth/
modules/session/
modules/user/
modules/media/
```

Không tổ chức feature thành các global layer kiểu:

```text
controllers/
services/
repositories/
schemas/
```

nếu cách này làm một request phải đi qua nhiều folder khác nhau.

## 6. Trách nhiệm của route

Route chỉ được:

- khai báo HTTP method,
- khai báo URL,
- gắn middleware,
- gắn validation,
- trỏ tới controller.

Route không được:

- gọi Prisma,
- gọi service trực tiếp,
- chứa business rule,
- orchestration nhiều use case,
- tự format domain error,
- kiểm tra ownership phức tạp.

## 7. Trách nhiệm của controller

Controller là HTTP adapter.

Controller nên:

1. lấy input đã validate,
2. lấy auth context nếu cần,
3. gọi một service use case chính,
4. trả HTTP response.

Controller không được:

- gọi Prisma,
- chứa business rule,
- hash password,
- tạo token,
- gửi email trực tiếp,
- chứa domain authorization,
- orchestration nhiều service không cần thiết.

Controller nên mỏng.

## 8. Trách nhiệm của service

Service chứa:

- use case,
- business rule,
- domain authorization,
- ownership check,
- transaction,
- database access,
- integration orchestration,
- mapping dữ liệu public nếu phù hợp.

Service được phép gọi Prisma trực tiếp.

Service không được:

- nhận Express Request hoặc Response,
- gọi res.json(),
- gọi next(),
- phụ thuộc route URL,
- phụ thuộc thứ tự middleware.

Tên method phải mô tả use case rõ ràng:

```text
authService.register()
authService.login()
userService.changeRole()
sessionService.revoke()
```

Tránh tên mơ hồ:

```text
process()
handleData()
execute()
doAction()
```

## 9. Trách nhiệm của schema

Schema dùng để:

- validate body,
- validate params,
- validate query,
- định nghĩa input type liên quan request khi phù hợp.

Ưu tiên derive input type từ schema.

Không tạo `types.ts` riêng chỉ để chứa một type nhỏ dùng trong một feature.

## 10. Quy tắc export

Ưu tiên export public API của module bằng object:

```ts
export const userService = {
  list,
  changeRole,
  updateStatus,
};
```

Helper nội bộ nhỏ, cùng trách nhiệm nên để private trong cùng file:

```ts
function toPublicUser(...) {}
async function issueToken(...) {}
```

Không export toàn bộ helper nội bộ.

## 11. Không tách file quá sớm

Không tách một use case đơn giản thành quá nhiều file.

Tránh kiểu:

```text
create-user.service.ts
update-user.service.ts
delete-user.service.ts
get-user.service.ts
```

nếu chúng vẫn thuộc cùng một user service nhỏ và cohesive.

Chỉ tách theo business capability thật sự.

Ví dụ hợp lý:

```text
auth.service.ts
session.service.ts
google-oauth.service.ts
```

khi các capability đó độc lập và có ý nghĩa riêng.

## 12. Cổng kiểm soát abstraction

Trước khi tạo mới:

- file,
- repository,
- interface,
- mapper,
- adapter,
- factory,
- helper,
- base class,
- strategy,
- wrapper,

phải trả lời:

1. Nó giải quyết vấn đề hiện tại nào?
2. Task hiện tại có thật sự cần không?
3. Nó có giảm coupling hoặc tăng clarity ngay bây giờ không?
4. Nó có giúp request dễ truy vết hơn không?
5. Nếu giữ logic trong file hiện tại thì có thực sự khó hiểu không?
6. Nếu lý do là abstraction, đã có hơn một consumer hoặc implementation thật chưa?

Nếu chưa trả lời được rõ ràng, không tạo abstraction.

## 13. Quy tắc pass-through wrapper

Wrapper chỉ forward argument thường không có giá trị.

Ví dụ:

```ts
async function getUser(id: string) {
  return userRepository.findById(id);
}
```

Nếu function không thêm:

- business rule,
- authorization,
- transformation,
- transaction,
- integration boundary,
- error handling có ý nghĩa,

thì phải xem lại việc giữ cả hai layer.

## 14. Quy tắc shared code

Infrastructure dùng chung cho nhiều feature có thể đặt trong `lib/`.

Ví dụ:

```text
prisma.ts
errors.ts
jwt.ts
password.ts
tokens.ts
r2.ts
google-oauth.ts
```

`lib/` không được chứa business rule riêng của feature.

Không tạo đồng thời nhiều bucket như:

```text
lib/
utils/
helpers/
common/
shared/
core/
```

nếu không có lý do architecture cụ thể.

## 15. Quy tắc middleware

Middleware có thể xử lý:

- authentication infrastructure,
- simple role gate,
- validation,
- rate limit,
- HTTP concern.

Domain authorization phức tạp hoặc ownership rule phải đặt trong service.

## 16. Kiểm soát phạm vi task

Mỗi task:

- chỉ sửa file cần thiết,
- không refactor toàn repository,
- không rename module không liên quan,
- không di chuyển hàng loạt file chỉ để đồng nhất,
- không đổi public API contract nếu không được yêu cầu,
- không thêm dependency nếu stack hiện tại đã đủ,
- không thêm feature tương lai.

Nếu phát hiện vấn đề ngoài scope, chỉ báo cáo.

## 17. Khả năng truy vết request

Trước khi code, phải trace flow hiện tại.

Ví dụ:

```text
POST /api/auth/login
→ auth.routes.ts
→ validate(loginSchema)
→ auth.controller.ts
→ auth.service.ts
→ session.service.ts
→ Prisma
→ response
```

Sau khi code, trace lại flow.

Một request bình thường phải hiểu được bằng cách mở các file thật sự có trách nhiệm.

Nếu request đơn giản phải đi qua quá nhiều wrapper/helper, phải xem xét đơn giản hóa.

## 18. Kích thước file và function

Không dùng con số cứng làm lý do chính để tách code.

File dài hoặc function dài chỉ là tín hiệu để review trách nhiệm.

Chỉ tách khi:

- trách nhiệm thật sự khác nhau,
- business capability độc lập,
- file hiện tại khó đọc,
- cần lifecycle/dependency độc lập,
- việc tách làm giảm complexity thay vì tăng số file phải mở.

## 19. Kiểm tra trước khi hoàn thành

Chạy các lệnh phù hợp với phạm vi thay đổi:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Có thể dùng command theo package.

Không được báo một command đã pass nếu thực tế chưa chạy.

## 20. Báo cáo bắt buộc cuối task

Mọi coding task phải kết thúc bằng:

```text
## File đã thay đổi
- ...

## Request flow
METHOD /path
→ route
→ middleware
→ controller
→ service
→ Prisma/repository
→ response

## Quyết định thiết kế
- Business logic được đặt ở đâu và vì sao.
- Có dùng repository hay không và vì sao.
- Abstraction nào được thêm và lý do.

## Kiểm tra
- command thực tế đã chạy

## Vấn đề ngoài scope
- vấn đề phát hiện nhưng không sửa
```

## 21. Nguyên tắc cuối cùng

Ưu tiên code rõ ràng, trực tiếp, dễ truy vết hơn architecture thông minh nhưng khó đọc.

Architecture phải chứng minh được lý do tồn tại.

Không được tạo file, layer, interface, repository, mapper, adapter, factory hoặc abstraction chỉ vì "đúng kiến trúc" hoặc "sau này có thể cần".
