# Frontend Agent Rules

## Phạm vi

Áp dụng cho mọi task thay đổi file trong `frontend/` hoặc frontend build configuration trong Docker.

Trước khi triển khai, đọc `AGENTS.md`, `CODEX_PROJECT_SETUP.md`, phase liên quan trong `CHECKLIST.md` và tài liệu frontend tương ứng trong `docs/`.

## Công nghệ

Frontend dùng Next.js App Router, TypeScript, Tailwind CSS, TanStack Query, Axios, React Hook Form và Zod.

## Kiến trúc

Luồng dữ liệu mặc định:

```text
Page → Feature Component → Feature Hook → Feature API → Axios Client → Backend
```

### Thư mục

- `src/app/`: routing, layout và page composition.
- `src/features/`: business UI theo domain.
- `src/components/ui/`: UI primitive dùng chung.
- `src/components/shared/`: component dùng chung giữa nhiều feature.
- `src/lib/`: Axios client, auth client, query client và utility hạ tầng.
- `src/hooks/`: hook dùng chung thật sự.
- `src/types/`: type dùng chung giữa nhiều feature.

Không tạo abstraction hoặc thư mục rỗng khi chưa có nhu cầu thật.

## App Router

- Page chỉ ghép feature component và truyền route params.
- Không gọi Axios trực tiếp trong page, kể cả auth/OAuth callback page.
- Chỉ thêm `"use client"` khi component cần hook, event hoặc browser API.
- Không đọc `window`, `document` hoặc `localStorage` trong Server Component.
- Không đọc `localStorage` trực tiếp trong render; dùng effect hoặc auth context/client phù hợp.

## API và server state

- Mọi API call đi qua Axios client dùng chung.
- Mỗi feature có API module riêng.
- Dùng TanStack Query cho server state.
- Query key phải lấy từ query key factory tập trung.
- Mutation thành công phải invalidate hoặc cập nhật đúng query liên quan.
- Không sao chép server state sang global store nếu không cần.
- Hiển thị rõ loading, empty và error state.

## Axios interceptor

- Không refresh hoặc redirect khi 401 đến từ auth route công khai.
- Chỉ refresh request ban đầu có authentication.
- Nhiều request 401 đồng thời phải dùng chung một refresh promise.
- Mỗi request chỉ được retry tối đa một lần.
- Không tạo vòng lặp refresh/logout.
- Lỗi đăng nhập phải được trả về form thay vì reload trang.

## Form

- Dùng React Hook Form.
- Dùng Zod schema và `zodResolver`.
- Policy validation frontend phải đồng bộ với backend.
- Hiển thị lỗi field và lỗi API rõ ràng.
- Không khóa submit âm thầm khi form không hợp lệ.
- Khi đang submit, phải có trạng thái loading và chống gửi lặp.

## Authentication và authorization

- Không tự quyết định nơi lưu token; tuân theo auth architecture đã chốt.
- Không truy cập token trực tiếp trong page hoặc component.
- Mọi thao tác token đi qua auth client dùng chung.
- Không lưu secret trong biến `NEXT_PUBLIC_*`.
- Frontend chỉ dùng permission để điều chỉnh UI; backend vẫn kiểm tra quyền thật.
- Không suy luận toàn quyền từ role rank nếu backend không có cùng rule.
- Permission catalog phải có một nguồn thống nhất, không viết lại ở nhiều component.
- UI không được là lớp duy nhất ép business/security rule như `mustChangePassword`.

## Component

- Mỗi component có một trách nhiệm rõ ràng.
- Tách component theo khối UI khi file tiến gần 300 dòng.
- Đưa logic lọc, sắp xếp hoặc state phức tạp vào feature hook.
- Không thêm global state library chỉ để xử lý component lớn.
- Không giữ dead code hoặc component không được render.

## Security

- Không render HTML chưa sanitize bằng `dangerouslySetInnerHTML`.
- Preview HTML không tin cậy phải dùng sandbox phù hợp.
- Không đặt secret trong frontend bundle.
- Không tin permission, role hoặc identity do client tự tạo.
- Validate file type/size ở frontend chỉ để UX; backend vẫn phải kiểm tra lại.

## Testing

Viết hoặc cập nhật test cho:

- Axios interceptor.
- Auth và refresh flow.
- Form validation quan trọng.
- Permission-based rendering.
- Query invalidation hoặc data transformation.
- Utility có business behavior.

Ưu tiên test hành vi người dùng và trường hợp lỗi, không chỉ snapshot.

## Verification

Chạy các lệnh phù hợp trong `frontend/`:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Cuối cùng chạy tại repository root:

```bash
git diff --check
```

Không báo pass cho lệnh chưa chạy. Nếu không chạy một lệnh vì không liên quan hoặc bị chặn, ghi rõ lý do trong báo cáo.
