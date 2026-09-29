# Module 07 - Files/storage

## Current file flow

The account file picker accepts any file type and uploads the original bytes as
`application/octet-stream`. `X-File-Name` carries the download name and
`X-File-Content-Type` carries the browser-reported MIME type (default:
`application/octet-stream`); the server validates and stores this metadata.
Downloads remain attachments so the browser does not execute uploaded content.
Each user is limited to 10 files of 5 MiB each. A new upload gets a new UUID,
so matching filenames do not overwrite existing files.

Updating a file writes a new object first, then swaps metadata in a Prisma
transaction, then removes the old object. If the database step fails, the new
object is removed and the old file remains available.

Baseline local (moi user toi da 10 tep; moi tep toi da 5 MiB) hỗ trợ upload/download tệp riêng của user đã đăng nhập. Backend nhận `application/octet-stream` và giới hạn 5 MiB khi đọc stream, trước khi giữ toàn bộ nội dung trong bộ nhớ. Mỗi tệp lưu dưới `backend/storage/<userId>/<uuid>`; client chỉ nhận UUID, không chọn đường dẫn hoặc tên file trên disk.

| Method | Endpoint | Kết quả |
| --- | --- | --- |
| `POST` | `/api/v1/files` | `201` với `{ id, size }` |
| `GET` | `/api/v1/files/:id` | Tải tệp của chính user dạng attachment |

Cả hai route yêu cầu Bearer access token. Upload quá 5 MiB trả `413 FILE_TOO_LARGE`, nội dung rỗng trả `400 EMPTY_FILE`, Content-Type sai trả `415 UNSUPPORTED_FILE_TYPE`. UUID sai trả `400 INVALID_FILE_ID`; tệp không thuộc user hoặc không tồn tại trả cùng `404 FILE_NOT_FOUND`.

File đang được ghi dở bị xóa khi stream lỗi hoặc vượt giới hạn. Không cung cấp API xóa hay danh sách; caller cần giữ ID trả về. Development/test dùng local disk; production ghi stream vào file tạm có giới hạn rồi tải lên Cloudflare R2 qua S3 API. File tạm được xóa sau khi tải lên hoặc khi lỗi. R2 key có dạng `<userId>/<uuid>`; bucket không công khai và API chỉ tải file qua Bearer token.

Production yêu cầu `STORAGE_R2_ENDPOINT` (`https://<account-id>.r2.cloudflarestorage.com`), `STORAGE_R2_BUCKET`, `STORAGE_R2_ACCESS_KEY_ID` và `STORAGE_R2_SECRET_ACCESS_KEY`. Thiếu cấu hình sẽ khiến backend fail-fast lúc khởi động. R2 dùng region `auto`, path-style request và quyền đọc/ghi object trong bucket. Lỗi R2 tạm thời trả `503 STORAGE_UNAVAILABLE`.

Update v? delete ki?m tra ownership trong service tr??c khi thao t?c. Update l?u object m?i, ghi metadata m?i, r?i x?a object v? metadata c?; n?u ghi metadata m?i th?t b?i, object m?i ???c cleanup. Delete x?a object tr??c r?i m?i x?a metadata ?? l?i storage gi? nguy?n metadata v? cho ph?p retry. Prisma v? storage kh?ng d?ng transaction nguy?n t? chung, v? v?y failure sau khi object c? ?? x?a v?n c?n retry ho?c cleanup v?n h?nh.
