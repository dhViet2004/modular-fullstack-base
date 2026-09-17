---
name: roadmap-checklist
description: Bắt buộc kiểm tra roadmap, xác minh tương xứng và cập nhật checklist cho mọi tính năng, thay đổi hành vi hoặc sửa lỗi trong repository này. Dùng khi triển khai hoặc hoàn tất công việc sản phẩm; không dùng cho yêu cầu chỉ đọc hoặc giải thích mà không thay đổi dự án.
---

# Quy trình Roadmap và Checklist

Xem `CODEX_PROJECT_SETUP.md` là roadmap/đặc tả sản phẩm và `README.md` là checklist hoàn thành.

## Trước khi triển khai

1. Đọc phần roadmap liên quan và mục checklist tương ứng trong README trước khi chỉnh sửa.
2. Kiểm tra implementation hiện tại và trạng thái repository. Không kết luận một hạng mục đã hoàn thành chỉ vì nó đang được đánh dấu `[x]`.
3. Xác định rõ yêu cầu roadmap hoặc mục checklist bị ảnh hưởng. Giữ đúng phạm vi người dùng yêu cầu khi roadmap còn các hạng mục lân cận chưa hoàn thành.

## Trong khi triển khai

- Triển khai hành vi hoàn chỉnh nhỏ nhất đáp ứng yêu cầu và các ràng buộc roadmap liên quan.
- Giữ nguyên thay đổi hiện có của người dùng và các ranh giới phân quyền.
- Thêm hoặc cập nhật test khi thay đổi hành vi, validation, bảo mật, cấu trúc dữ liệu hoặc persistence.
- Không đánh dấu hoàn thành khi implementation hoặc bước xác minh bắt buộc vẫn còn dang dở.

## Điều kiện hoàn thành

Trước khi báo hoàn thành:

1. Chạy bước xác minh tương xứng với thay đổi, ví dụ test mục tiêu cùng typecheck/lint cho ứng dụng bị ảnh hưởng. Ghi nhận trung thực mọi blocker về credential hoặc môi trường bên ngoài.
2. Đọc lại phần liên quan trong `CODEX_PROJECT_SETUP.md` và đối chiếu với hành vi vừa triển khai. Xử lý các thiếu sót nằm trong phạm vi; báo cáo phần ngoài phạm vi thay vì tự ý mở rộng task.
3. Cập nhật `README.md` trong cùng thay đổi:
   - Chỉ đánh dấu `[x]` cho mục hiện có khi implementation và verification đều pass.
   - Thêm một mục checklist ngắn gọn nếu năng lực vừa hoàn thành chưa được thể hiện.
   - Giữ `[ ]` và thêm lý do `BLOCKED:` khi trạng thái bên ngoài ngăn việc xác minh.
   - Sửa lại mục `[x]` lỗi thời nếu kiểm tra cho thấy nó chưa thực sự hoàn thành.
4. Chạy `git diff --check` sau khi cập nhật checklist.

Phản hồi cuối phải nêu rõ phần roadmap/checklist đã cập nhật và tóm tắt kết quả xác minh. Không được tuyên bố checklist đã cập nhật nếu chưa kiểm tra lại sau khi triển khai.
