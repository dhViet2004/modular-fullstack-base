# Skill: Triển khai Frontend Feature

Dùng skill này khi tạo mới hoặc mở rộng behavior frontend.

## Bước 1 — Đọc

Đọc:

- `AGENTS.md`
- `.agents/roles/frontend.md`
- page/component liên quan
- feature API liên quan
- backend contract liên quan

## Bước 2 — Phân loại state

Mỗi state phải được xác định là:

- local UI state,
- server state,
- cross-component client state.

Dùng:

- component state cho local UI state,
- TanStack Query cho server state,
- Zustand cho shared client state thật sự cần, ví dụ auth.

## Bước 3 — Giữ page mỏng

Page chủ yếu:

```text
đọc auth/UI state
→ gọi query/mutation
→ render component
```

Không đặt backend business rule trong page.

## Bước 4 — API flow

Dùng shared API client.

Ưu tiên:

```text
component/page
→ feature API
→ shared api-client
→ backend
```

Không thêm repository/service/adapter layer phía frontend nếu chưa có nhu cầu thật.

## Bước 5 — Tách component có lý do

Chỉ tách component khi:

- có UI responsibility độc lập,
- có reuse thực sự,
- làm readability tốt hơn rõ ràng.

Không tách chỉ vì muốn giảm số dòng.

## Bước 6 — Kiểm tra

Chạy lint, typecheck, test nếu có và build frontend.

## Bước 7 — Báo cáo cuối

Báo cáo:

- file đã thay đổi,
- data flow,
- lựa chọn state,
- command đã chạy,
- vấn đề ngoài scope.
