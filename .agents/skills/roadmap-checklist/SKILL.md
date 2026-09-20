---
name: roadmap-checklist
description: Đồng bộ yêu cầu, roadmap và checklist khi triển khai tính năng, sửa bug hoặc thay đổi behavior, API, validation, security, schema, persistence hay frontend behavior. Không dùng cho yêu cầu chỉ đọc hoặc giải thích không làm thay đổi project.
---

# Roadmap và Checklist Workflow

Đọc `AGENTS.md` trước và tuân thủ toàn bộ quy tắc scope, an toàn, verification và báo cáo trong đó.

## Trước khi triển khai

1. Đọc yêu cầu liên quan trong `CODEX_PROJECT_SETUP.md`.
2. Đọc phase và task liên quan trong `CHECKLIST.md`.
3. Đọc checklist roadmap liên quan trong `README.md`.
4. Đọc tài liệu domain tương ứng trong `docs/`.
5. Inspect code, config và test hiện tại.
6. Kiểm tra Git status để nhận biết thay đổi có sẵn của người dùng.
7. Xác định phạm vi, tiêu chí hoàn thành và các file dự kiến thay đổi.

## Trong khi triển khai

- Implement thay đổi nhỏ nhất nhưng hoàn chỉnh.
- Giữ nguyên behavior không thuộc phạm vi.
- Không tự sửa module hoặc checklist ngoài phạm vi.
- Không bỏ qua business rule hiện có.
- Thêm hoặc cập nhật test khi thay đổi behavior, API, validation, security, schema hoặc persistence.
- Không đánh dấu checklist hoàn thành trước khi verification pass.

## Verification

Chạy các lệnh phù hợp trong app bị ảnh hưởng:

```bash
pnpm lint
pnpm typecheck
pnpm test
```

Chạy thêm khi task liên quan:

```bash
pnpm build
pnpm db:generate
pnpm db:migrate:deploy
pnpm db:seed
```

Cuối cùng chạy tại repository root:

```bash
git diff --check
```

Không bắt buộc chạy lệnh không liên quan, nhưng phải báo cáo rõ:

- Lệnh đã chạy và kết quả.
- Lệnh chưa chạy và lý do.
- Phần bị chặn bởi môi trường hoặc credential.

## Cập nhật checklist

Sau khi implement và verify:

1. Kiểm tra lại yêu cầu ban đầu trong `CODEX_PROJECT_SETUP.md`.
2. Cập nhật task theo phiên trong `CHECKLIST.md`.
3. Nếu task thuộc roadmap sản phẩm, cập nhật cả `README.md`.

Quy ước:

- `[x]`: implementation và verification đều pass.
- `[~]`: task đang thực hiện nhưng chưa hoàn tất.
- `[ ]`: chưa hoàn thành.
- `[ ] ... — BLOCKED: <lý do>`: không thể verify vì môi trường hoặc credential bên ngoài.

Không đánh dấu `[x]` chỉ vì code đã tồn tại hoặc đã được viết.

## Báo cáo

Báo cáo theo format bắt buộc trong `AGENTS.md`, nêu rõ:

1. Đã làm gì.
2. Đã kiểm tra gì.
3. File đã thay đổi.
4. Checklist đã cập nhật.
5. Blocker hoặc phần chưa kiểm chứng.
6. Bước tiếp theo.
