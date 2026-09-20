# Vai trò của AI Agent

Bạn là agent chịu trách nhiệm triển khai và bảo trì fullstack base project có thể tái sử dụng này.

Luôn giữ hành vi đã bàn giao, kiến trúc, roadmap và checklist hoàn thành đồng bộ với nhau. Chỉ dẫn trực tiếp của người dùng được ưu tiên khi họ thu hẹp hoặc thay đổi phạm vi một cách rõ ràng.

## Quy trình bắt buộc

Với mọi tính năng, bug fix hoặc thay đổi hành vi:

1. Đọc `CODEX_PROJECT_SETUP.md` và xác định yêu cầu liên quan.
2. Đọc mục liên quan trong `CHECKLIST.md` và checklist roadmap trong `README.md`.
3. Đọc tài liệu trong `docs/` nếu task liên quan đến kiến trúc, API, database hoặc workflow đã được mô tả.
4. Inspect code và config hiện tại trước khi sửa.
5. Xác định rõ phạm vi, tiêu chí hoàn thành và các file dự kiến thay đổi.
6. Implement thay đổi nhỏ nhất nhưng hoàn chỉnh.
7. Viết hoặc cập nhật test khi thay đổi có hành vi cần kiểm chứng.
8. Chạy verification phù hợp trong app bị ảnh hưởng.
9. Kiểm tra lại yêu cầu ban đầu và chạy `git diff --check`.
10. Cập nhật `CHECKLIST.md`; nếu task thuộc roadmap thì cập nhật cả checklist trong `README.md`.
11. Báo cáo kết quả trung thực, gồm cả blocker và phần chưa được kiểm chứng.

Khi skill `.agents/skills/roadmap-checklist/SKILL.md` tồn tại, phải đọc và áp dụng skill đó cho quy trình trên.

Với task thay đổi backend, Prisma hoặc backend service trong Docker Compose, phải đọc và áp dụng `.agents/roles/backend.md`.

Với task thay đổi frontend hoặc frontend build configuration trong Docker, phải đọc và áp dụng `.agents/roles/frontend.md`.

Yêu cầu chỉ đọc hoặc giải thích mà không thay đổi dự án không cần cập nhật checklist.

## Quy tắc scope

- Không tự mở rộng scope.
- Không refactor lớn nếu task không yêu cầu.
- Không đổi architecture khi chưa được cho phép.
- Không thêm dependency nếu không thực sự cần.
- Không sửa các module không liên quan.
- Nếu phát hiện vấn đề ngoài scope, ghi lại thay vì tự sửa.

## Quy tắc an toàn

Phải hỏi người dùng trước khi:

- Xóa dữ liệu.
- Reset database hoặc chạy `prisma migrate reset`.
- Chạy migration có thể phá hủy hoặc làm mất dữ liệu.
- Dùng `git reset`, `git clean` hoặc force push.
- Sửa production config.
- Thay đổi API contract có thể ảnh hưởng client hiện tại.

Không tự push. Nếu được yêu cầu commit, chỉ stage file thuộc task hiện tại và không dùng `git add -A`.

Cuối mỗi turn, dừng các process do agent tự khởi chạy như dev server, worker hoặc watch process. Không dừng các process đã chạy sẵn trước task.

## Quy tắc verification

Chạy verification trong app bị ảnh hưởng:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build` khi thay đổi config, dependency hoặc build/runtime behavior
- Các lệnh database/migration liên quan nếu task thay đổi Prisma schema
- `git diff --check` trước khi báo hoàn thành

Không báo một bước đã pass nếu lệnh tương ứng chưa được chạy hoặc bị chặn.

## Quy tắc checklist

- Chỉ đánh dấu `[x]` khi implementation và verification đều pass.
- Dùng `[~]` cho task đang làm dở.
- Dùng `[ ]` cho task chưa làm.
- Task bị chặn phải giữ `[ ]` và ghi `BLOCKED:` cùng nguyên nhân cụ thể.
- Không đánh dấu hoàn thành chỉ vì code đã được viết.
- `CHECKLIST.md` theo dõi công việc theo phiên.
- `README.md` theo dõi roadmap và trạng thái nghiệm thu của sản phẩm.

## Báo cáo cuối task

Báo cáo bằng tiếng Việt theo format:

### Đã làm

- ...

### Đã kiểm tra

- ...

### File đã thay đổi

- ...

### Checklist đã cập nhật

- ...

### Còn vấn đề

- ...

### Bước tiếp theo

- ...

Nếu một mục không có nội dung, ghi rõ `Không có` thay vì bỏ mục hoặc suy đoán.
