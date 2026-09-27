# Hướng dẫn Claude cho project

`AGENTS.md` là source of truth cho toàn bộ engineering rules.

Trước khi code:

1. Đọc `AGENTS.md`.
2. Đọc role phù hợp trong `.agents/roles/`.
3. Đọc skill phù hợp trong `.agents/skills/`.
4. Trace request hoặc data flow hiện tại.
5. Chỉ sửa đúng phạm vi feature được yêu cầu.

Backend mặc định:

```text
route → controller → service → Prisma
```

Repository là optional và phải có lý do rõ ràng.

Không thêm abstraction chỉ vì "đúng kiến trúc" hoặc "sau này có thể cần".

Luôn kết thúc bằng:

- file đã thay đổi,
- request flow,
- quyết định thiết kế,
- command thực tế đã chạy,
- vấn đề ngoài scope.
