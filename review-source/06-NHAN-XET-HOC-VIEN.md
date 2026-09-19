# 06. Nhận xét dành cho học viên

## Lời mở đầu

Đây là lần review thứ hai. Điều đầu tiên cần nói thẳng: **source code chưa thay đổi kể từ lần review trước**. Toàn bộ 50 vấn đề của v1 vẫn còn nguyên, và các mục trong README mà v1 chỉ ra là tick chưa đúng vẫn đang được tick. Review chỉ có giá trị khi được biến thành hành động. Vì vậy lần này, file `05-LO-TRINH-CAI-THIEN.md` được viết thành từng việc nhỏ, có cột "Kiểm chứng", để em có thể làm lần lượt mà không bị ngợp.

Tin tốt là **nền móng của em vững hơn mức thường thấy**. Phần lớn lỗi nghiêm trọng có thể sửa trong vài ngày, bằng những thay đổi nhỏ, không phải đập đi làm lại.

## 1. Những điều em đã làm tốt

1. **Pipeline xác thực hội tụ.** Bốn cách đăng nhập (mật khẩu, OTP, magic link, Google) đều trả về `StrategyResult` rồi đi qua cùng `identityService.resolve` và `authService.complete` (`auth/auth.service.ts`). Kiểm tra trạng thái, tạo session, ghi audit nằm ở một chỗ. Đây là tư duy thiết kế của người làm hệ thống, không phải của người chỉ viết cho chạy.
2. **Xử lý secret đúng chuẩn.** Mật khẩu dùng argon2id; refresh token, OTP, token magic link chỉ lưu SHA-256; challenge có TTL, giới hạn 5 lần thử và **tiêu thụ nguyên tử** (`updateMany where consumedAt: null` + kiểm tra `count === 1`). Nhiều dự án thực tế còn chưa làm được điều này.
3. **JWT gắn với session trong DB.** `authenticate.middleware.ts` kiểm tra `sid` còn hoạt động ở mỗi request, nên thu hồi phiên có hiệu lực ngay, và có test chứng minh. Chính thiết kế này làm giảm mức độ của SEC-006: biết secret JWT vẫn chưa đủ để giả mạo.
4. **Nghĩ đến đồng thời ở chỗ khó nhất.** Bootstrap SUPER_ADMIN dùng `pg_advisory_xact_lock` để hai callback Google đến cùng lúc không tạo ra hai SUPER_ADMIN. Dedup file dùng `hash @unique` và xử lý trường hợp tạo trùng.
5. **Google OAuth làm đúng bài bản**: state, PKCE S256, xác minh `id_token` qua JWKS với issuer/audience, bắt buộc `email_verified`, và dùng handoff code một lần thay vì đưa token lên URL.
6. **Kiến trúc module rõ ràng** ở cả hai phía: backend chia `routes/controller/service/repository`, frontend chia theo feature, storage có interface với hai implementation (Local, R2) và có unit test cho R2.
7. **Có test integration trên PostgreSQL thật** cho những ca âm tính quan trọng: sai mật khẩu, user bị khóa, token đã thu hồi, challenge dùng lại, link hết hạn.
8. **Template email an toàn**: escape biến, whitelist tên biến, preview trong `iframe sandbox`.

## 2. Tư duy đúng cần phát huy

Những điểm tốt ở trên cho thấy em **đã có** các tư duy sau. Việc cần làm là áp dụng chúng nhất quán cho toàn bộ codebase, thay vì chỉ ở vài chỗ:

| Em đã làm ở… | Hãy áp dụng thêm cho… |
| --- | --- |
| Advisory lock cho bootstrap | Mọi chỗ "kiểm tra rồi mới làm": refresh token, xóa file, đăng ký, tạo session |
| Pipeline đăng nhập "một cửa" | Phân quyền: mọi route ghi đều phải qua `authorize`, có test tự động bắt route thiếu |
| Không tin client khi kiểm tra chủ sở hữu (`findOwned`) | Không tin `Host` header, không để client chọn `queue`, không tin MIME từ header |
| Test âm tính cho auth | Test âm tính cho phân quyền: "user thường gọi API quản trị phải nhận 403" |

## 3. Lỗi mang tính hệ thống

Phần này không liệt kê lại từng lỗi (đã có ở file 02) mà gom thành **các thói quen** sinh ra lỗi. Sửa một thói quen sẽ ngăn được cả một loạt lỗi về sau.

### 3.1 Phân quyền đặt ở giao diện thay vì ở server

- **Biểu hiện**: menu Jobs, Files ẩn/hiện theo permission, nhưng API phía sau không kiểm tra (SEC-001, SEC-002). Seed tạo 26 permission mà backend chỉ kiểm tra 6 (ARCH-003). `mustChangePassword` chỉ được ép bằng modal (SEC-016).
- **Vì sao nguy hiểm**: giao diện chỉ là **một** client. Bất kỳ ai cũng gọi API được bằng `curl` hay DevTools. Chính đặc tả mục 32 đã ghi: "Backend luôn là nơi authorization cuối cùng".
- **Thói quen cần thay**: mỗi khi viết một route, trả lời được câu hỏi *"ai được phép gọi route này, và dòng code nào đảm bảo điều đó?"*. Nếu câu trả lời là "UI không hiện nút", thì route đó chưa được bảo vệ.

### 3.2 Chưa xác định rõ ranh giới tin cậy

- **Biểu hiện**: tin `Host` header để dựng link (SEC-003); để client chọn hàng đợi (SEC-001); tin rằng "Google đã xác minh email" nghĩa là tài khoản cũ cùng email cũng đáng tin (SEC-017); tin MIME từ header (SEC-012).
- **Vì sao nguy hiểm**: SEC-017 là ví dụ rõ nhất. Google chứng minh người **đang đăng nhập** sở hữu email, nhưng không nói gì về người **đã đặt mật khẩu** cho tài khoản chưa xác minh trước đó. Gộp hai sự thật này làm một mở đường cho việc chiếm tài khoản, kể cả SUPER_ADMIN.
- **Thói quen cần thay**: với mỗi dữ liệu đi vào hệ thống, hỏi *"ai kiểm soát giá trị này?"*. Nếu là người dùng hay bên thứ ba thì phải kiểm tra, hoặc thay bằng giá trị do server kiểm soát.

### 3.3 "Kiểm tra rồi mới làm" khi có đồng thời

- **Biểu hiện**: refresh token (ERR-003), xóa file (ERR-020), dọn orphan (ERR-005), đăng ký và tạo session (ERR-012).
- **Vì sao nguy hiểm**: khi test tay, request đến lần lượt nên không bao giờ thấy lỗi. Ngoài thực tế, người dùng bấm hai lần, trình duyệt gửi song song, client tự retry.
- **Thói quen cần thay**: đưa điều kiện vào **chính câu lệnh ghi** (`updateMany where { id, deletedAt: null }` rồi kiểm tra `count`), dựa vào unique constraint, hoặc dùng transaction. Em đã biết cách này (`challenge.repository.ts` → `consume`), chỉ cần dùng rộng hơn.

### 3.4 Các luồng song song xử lý không nhất quán

- **Biểu hiện**: đổi mật khẩu xóa cờ mật khẩu tạm nhưng quên mật khẩu thì không (ERR-017); Google set `emailVerifiedAt` nhưng OTP/magic link thì không (ERR-006); Google ghi đè tên mỗi lần đăng nhập (ERR-011).
- **Thói quen cần thay**: khi một trạng thái (`mustChangePassword`, `emailVerifiedAt`) có thể bị thay đổi từ nhiều luồng, hãy liệt kê **tất cả** các luồng đó thành một bảng và kiểm tra từng dòng. Tốt hơn nữa là gom logic cập nhật trạng thái vào một hàm duy nhất.

### 3.5 Test xác nhận code thay vì xác nhận yêu cầu

- **Biểu hiện**: test `links verified Google login to an existing password account` khẳng định đúng hành vi gây ra SEC-017. Test jobs mock `prisma` và `boss` sâu nên không phát hiện handler đọc sai dạng dữ liệu (ERR-004). Không có test nào cho phân quyền theo route (TEST-001).
- **Vì sao nguy hiểm**: test viết *sau* code, dựa trên việc code *đang làm gì*, sẽ "khóa" luôn cả lỗi vào hệ thống. Lần sau có người sửa đúng thì test lại báo đỏ.
- **Thói quen cần thay**: viết test từ **yêu cầu** và từ **kẻ tấn công**: "người không có quyền phải bị chặn", "mật khẩu cũ của tài khoản chưa xác minh không được dùng tiếp". Với mỗi test ca thành công, hãy có ít nhất một test ca bị từ chối.

### 3.6 "Xong" được định nghĩa bằng dấu tick thay vì bằng bằng chứng

- **Biểu hiện**: README tick `db:migrate` pass trong khi thiếu migration (DB-001); tick `pnpm lint` pass trong khi code có `any` mà luật lint cấm (CODE-004); tick "Storage failure handled" trong khi lỗi bị nuốt im lặng (OPS-005); tick "Markdown import hoạt động" trong khi job không lưu gì (ERR-022). Sau review v1, các mục này **vẫn chưa được sửa** (DOC-001).
- **Vì sao nguy hiểm**: checklist là thứ mentor, đồng đội và chính em sau 3 tháng sẽ tin vào. Một checklist không đáng tin còn tệ hơn không có checklist.
- **Thói quen cần thay**: chỉ tick khi em (không phải AI agent) đã chạy lệnh kiểm chứng trên môi trường sạch, và ghi lại lệnh đó. Chính `AGENTS.md` của em đã đặt ra quy tắc này; hãy thực hiện nó.

### 3.7 Nhận đầu ra của AI mà không kiểm soát hình thức

- **Biểu hiện**: 59/190 file bị nén thành 1–3 dòng, 5 component vượt 500 dòng (CODE-001), nhiều dead code (CODE-003), hai phong cách code trong cùng repo.
- **Vì sao nguy hiểm**: code không đọc được thì không review được. Code không review được thì mọi lỗi ở trên sẽ tiếp tục lọt qua.
- **Thói quen cần thay**: Prettier + lint chạy tự động (pre-commit và CI) để hình thức không còn phụ thuộc vào việc AI "nhớ" quy ước.

## 4. Kiến thức còn thiếu và thứ tự nên học

Thứ tự dưới đây xếp theo mức độ ảnh hưởng tới chính dự án này. Mỗi mục đều có bài tập thực hành ngay trên repo.

| # | Chủ đề | Vì sao cần | Thực hành trên repo |
| --- | --- | --- | --- |
| 1 | **Authorization phía server**, OWASP API Security Top 10 (đặc biệt BOLA, BFLA: broken object/function level authorization) | Rủi ro số 1 hiện tại | Sửa SEC-001, SEC-002; viết test ma trận phân quyền |
| 2 | **Identity và liên kết tài khoản** (account linking, pre-account hijacking) | Hiểu vì sao "email đã xác minh" không đồng nghĩa "tài khoản đáng tin" | Sửa SEC-017 và viết lại test tương ứng |
| 3 | **Quy trình migration với Prisma**: khác nhau giữa `migrate dev`, `db push`, `migrate deploy`; shadow database; drift | Để "chạy trên máy em" trở thành "chạy ở mọi nơi" | Sửa DB-001; thêm `migrate diff --exit-code` vào CI |
| 4 | **Đồng thời trong database**: transaction, update có điều kiện, unique constraint, isolation level | Nguồn gốc của nhóm lỗi 3.3 | Sửa ERR-003, ERR-020 |
| 5 | **HTTP và trình duyệt**: CORS preflight, cookie vs localStorage, `Host` header, reverse proxy và `trust proxy` | CORS là chính sách của trình duyệt, không phải bảo mật server | Sửa ERR-001, SEC-003; đọc lại OPS-003 |
| 6 | **Kiểm thử theo rủi ro**: test âm tính, test ma trận, test tích hợp qua HTTP (supertest) thay vì mock sâu | Để test bắt được lỗi thay vì khóa lỗi lại | TEST-001, test interceptor frontend |
| 7 | **Vận hành cơ bản**: cấu hình theo 12-factor, Docker multi-stage và build args, CI tối thiểu | Để deploy lần đầu không thất bại | OPS-001, OPS-002, SEC-006, CI |
| 8 | **Kỷ luật review**: Prettier, commit nhỏ, đọc diff trước khi commit | Nền tảng cho mọi mục trên | CODE-001 |

## 5. Làm việc với AI agent hiệu quả hơn

Em đã có `AGENTS.md` và skill `roadmap-checklist`, tức là đã nghĩ đến quy trình. Vài điều chỉnh sẽ giúp quy trình đó thật sự bảo vệ chất lượng:

1. **Giao task nhỏ, kèm tiêu chí từ chối.** Thay vì "thêm module Jobs", hãy giao "thêm route tạo lịch; user không có `jobs.create` phải nhận 403; viết test cho cả hai ca".
2. **Với mỗi endpoint mới, hỏi agent hai câu**: "Ai gọi được endpoint này?" và "Nếu hai request đến cùng lúc thì sao?".
3. **Đọc diff trước khi commit.** Sau khi có Prettier, diff sẽ đọc được. Nếu em không giải thích được một thay đổi thì chưa commit.
4. **Không để agent tự tick checklist.** Agent có thể đề xuất; em tick sau khi tự chạy lệnh kiểm chứng.
5. **Soi test do agent viết**: test đang kiểm tra yêu cầu, hay chỉ đang chụp lại hành vi hiện tại của code?

## 6. Đánh giá tổng quát

| Tiêu chí | Mức | Nhận xét ngắn |
| --- | --- | --- |
| Độ phủ tính năng so với đặc tả | Tốt | Gần đủ các mục; lệch có chủ ý ở OTP/magic link UI |
| Kiến trúc | Khá | Modular monolith phù hợp quy mô; cần tách worker và đưa state ra khỏi RAM |
| Bảo mật nền tảng (mật mã, session) | Tốt | Nhiều quyết định đúng và không dễ |
| Phân quyền | Cần cải thiện | Hai module bỏ trống phân quyền server; không có trần quyền |
| Database | Khá / Cần cải thiện | Mô hình tốt; quy trình migration hỏng (Critical) |
| Kiểm thử | Trung bình | Có test integration thật; thiếu test phân quyền và test âm tính cho module mới |
| Chất lượng code | Trung bình | Không đồng đều: phần tốt rất tốt, phần nén/quá lớn khó bảo trì |
| Vận hành | Cần cải thiện | Chưa có CI, Docker chưa deploy được đúng, health check hình thức |
| Độ tin cậy của checklist | Cần cải thiện | Nhiều mục tick chưa đúng và chưa được sửa sau v1 |

## Lời kết

Em đã chứng minh được mình hiểu những khái niệm bảo mật khó: rotation, tiêu thụ nguyên tử, PKCE, advisory lock. Khoảng cách còn lại không nằm ở kiến thức nâng cao, mà ở **sự nhất quán**: áp dụng những gì em đã biết cho *mọi* route, *mọi* luồng, *mọi* dấu tick.

Gợi ý cho lần review tiếp theo: hoàn thành giai đoạn 0 trong `05-LO-TRINH-CAI-THIEN.md`, mỗi việc một commit có test, rồi tự rà lại README. Khi đó chúng ta sẽ có một bản so sánh v2 → v3 thực sự có tiến bộ để ghi nhận.
