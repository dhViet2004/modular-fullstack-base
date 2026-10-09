# Core Base - Figma Design System

Ngày phân tích: 2026-10-08 (Asia/Saigon). Source snapshot: `c94018c067e16f444b09ed52f71b5ec3d412d5cb`.

> Trạng thái toàn bộ file: **PARTIAL - BLOCKED_BY_MCP_QUOTA**. Đã lập inventory 81 frame; đã đọc design context và screenshot của cover cùng 5 frame Design System. 75 frame Product & Handoff chưa được đọc chi tiết. Tài liệu này không xác nhận giao diện của những frame chưa đọc.

Nguồn: [file Figma](https://www.figma.com/design/w7niXpOtilM8YR13A2nrsF/Untitled). Xem [SCREEN_MAPPING.md](SCREEN_MAPPING.md) để có inventory đầy đủ, mapping source và hàng đợi đọc tiếp.

Cập nhật triển khai: người dùng đã cho phép Phase A chỉ dựa trên 5 frame Design System đã đọc. **A.1 Foundations & shared layout đã implement và verify** trên working tree; chi tiết ở mục 12. A.2 Shared UI Primitives ở mục 13; A.3 App Shell & Role-based Navigation ở mục 14. Implementation/verification được phân biệt với đối chiếu visual; trạng thái PARTIAL ở trên vẫn áp dụng cho việc phân tích toàn bộ file Figma.

Cập nhật 2026-10-09: **B.1 Public & Auth, B.2 MEMBER, B.3 ADMIN và B.4 SUPER_ADMIN đã triển khai và verify 62/62 frame chức năng** từ mapping APPROVED và ảnh tổng hợp; visual **VISUAL_PARTIAL**. Báo cáo B.1–B.4 ở mục 15–18. Quota MCP/context/asset gốc vẫn thiếu; 13 frame ngoài bốn phase chưa triển khai. Không gọi Figma MCP trong B.2–B.4.

## 1. Bằng chứng và giới hạn

- `whoami` thành công: seat Full, plan Starter. Kết nối MCP hoạt động.
- `get_metadata` không truyền node ID chỉ liệt kê cover; `use_figma` truy vấn `figma.root.children` xác nhận 3 page. Product frames nằm trong 6 section, đã duyệt xuống từng section bằng document structure.
- 5 frame Design System đã trả design context có code tham chiếu, style information và screenshot; đã xem cả 5 screenshot. Không đánh dấu metadata-only là đã đọc chi tiết.
- `use_figma` đã đọc trực tiếp text, hierarchy, Auto Layout, typography, variable bindings và component properties của Foundations và Shell & navigation. Ba truy vấn native còn lại bị quota chặn sau khi design context/screenshot đã đọc thành công.
- `get_variable_defs` của cover và bindings/collections đã đọc trong cùng cuộc phân tích ngày này được dùng làm bằng chứng bổ sung. Lần gọi `get_variable_defs` cho Foundations bị quota chặn; chưa có dump toàn bộ variable collection của file.
- Screenshots được xem trong kết quả MCP; không lưu screenshot hoặc asset URL tạm vào repository. Các node link trong tài liệu trỏ tới nguồn Figma.

Lỗi server đã xác nhận cho `get_design_context`, `get_screenshot`, `get_variable_defs`, `get_metadata` và `use_figma`:

```text
You've reached the Figma MCP tool call limit on the Starter plan.
Upgrade your plan for more tool calls.
```

Tài nguyên `file://figma/docs/rate-limits-access.md` của MCP ghi Starter tối đa 20 tool calls/tháng. Server không trả thời điểm reset hoặc số lượt đã dùng. Chia nhỏ payload không khắc phục được quota đã hết. [Tài liệu Figma về hạn mức](https://developers.figma.com/docs/figma-mcp-server/rate-limits-access/). Code Connect cũng yêu cầu Organization/Enterprise; chưa có mapping Code Connect được xác minh.

## 2. Pages và frame Design System

| Page ID   | Page                    | Cấu trúc đã quan sát    |
| --------- | ----------------------- | ----------------------- |
| `0:1`     | 00 Cover & Map          | 1 frame trực tiếp       |
| `4:44259` | 01 Design System        | 5 frame trực tiếp       |
| `4:44260` | 02–07 Product & Handoff | 6 section chứa 75 frame |

Cover mô tả 8 nhóm nội dung; file thực tế có 3 page. Không tạo thêm page hay route ứng dụng từ chỉ mục này.

| Node ID                                                                                 | Top-level frame                       | Kích thước  | Design context | Screenshot | Native attributes                               |
| --------------------------------------------------------------------------------------- | ------------------------------------- | ----------- | -------------- | ---------- | ----------------------------------------------- |
| [4:39987](https://www.figma.com/design/w7niXpOtilM8YR13A2nrsF/Untitled?node-id=4-39987) | 01 Design System / Foundations        | 1440 x 1465 | Đã đọc         | Đã xem     | Đã đọc                                          |
| [4:40074](https://www.figma.com/design/w7niXpOtilM8YR13A2nrsF/Untitled?node-id=4-40074) | 01 Design System / Shell & navigation | 1440 x 1046 | Đã đọc         | Đã xem     | Đã đọc                                          |
| [4:40139](https://www.figma.com/design/w7niXpOtilM8YR13A2nrsF/Untitled?node-id=4-40139) | 01 Design System / Forms & buttons    | 1440 x 1521 | Đã đọc         | Đã xem     | Bị quota chặn; layout/style đã có trong context |
| [4:40287](https://www.figma.com/design/w7niXpOtilM8YR13A2nrsF/Untitled?node-id=4-40287) | 01 Design System / Data & feedback    | 1440 x 1684 | Đã đọc         | Đã xem     | Bị quota chặn; layout/style đã có trong context |
| [4:40368](https://www.figma.com/design/w7niXpOtilM8YR13A2nrsF/Untitled?node-id=4-40368) | 01 Design System / Security & files   | 1440 x 966  | Đã đọc         | Đã xem     | Bị quota chặn; layout/style đã có trong context |

## 3. Variables và colors

Collections đã quan sát qua binding của cover và native inspection:

| Collection             | ID                             | Mode đã quan sát |
| ---------------------- | ------------------------------ | ---------------- |
| CoreStack / Primitives | `VariableCollectionId:4:43590` | `Mode 1` (`4:0`) |
| CoreStack / Semantic   | `VariableCollectionId:4:43591` | `Light` (`4:1`)  |

Semantic colors dùng alias tới primitive colors. Bảng dưới là các variable references và giá trị resolved/fallback thực sự có trong design context đã đọc, không phải khẳng định đã liệt kê hết variables của file.

| Token                | Giá trị   |
| -------------------- | --------- |
| `background/default` | `#f8fafc` |
| `text/primary`       | `#0f172a` |
| `text/secondary`     | `#64748b` |
| `surface/default`    | `#ffffff` |
| `border/default`     | `#e2e8f0` |
| `action/primary`     | `#2563eb` |
| `status/success`     | `#16a34a` |
| `status/warning`     | `#d97706` |
| `status/danger`      | `#dc2626` |
| `palette/eff6ff`     | `#eff6ff` |
| `palette/f1f5f9`     | `#f1f5f9` |
| `palette/000000`     | `#000000` |
| `palette/b91c1c`     | `#b91c1c` |
| `palette/1d4ed8`     | `#1d4ed8` |
| `palette/1e293b`     | `#1e293b` |
| `palette/f0fdf4`     | `#f0fdf4` |
| `palette/15803d`     | `#15803d` |
| `palette/fef2f2`     | `#fef2f2` |
| `palette/fffbeb`     | `#fffbeb` |
| `palette/92400e`     | `#92400e` |

Foundations còn ghi thang màu Slate `#F8FAFC / #F1F5F9 / #E2E8F0 / #CBD5E1 / #94A3B8 / #64748B / #475569 / #334155 / #1E293B / #0F172A`, và Blue `#EFF6FF / #BFDBFE / #2563EB / #1D4ED8`. Các giá trị chỉ xuất hiện trong phần mô tả này chưa được xác minh là variable đã tạo nếu không nằm trong bảng references.

Đối với status text, thiết kế chỉ định success `#15803D` và warning `#92400E`; không dùng nguyên màu swatch success/warning cho tất cả text. Nội dung Foundations yêu cầu không dùng màu làm tín hiệu duy nhất.

## 4. Typography

Font family: Inter. Ngôn ngữ nội dung: tiếng Việt; locale: vi-VN. Body weight 400; headings và labels nhấn mạnh weight 600. Letter spacing đã quan sát: 0.

| Text style                      | Size / line height               | Weight | Nguồn                                          |
| ------------------------------- | -------------------------------- | ------ | ---------------------------------------------- |
| `CoreStack/Type/32/Semi Bold/1` | 32 / 48 px                       | 600    | Native + context                               |
| `CoreStack/Type/16/Regular/2`   | 16 / 24 px                       | 400    | Native + context                               |
| `CoreStack/Type/20/Semi Bold/3` | 20 / 30 px                       | 600    | Native + context                               |
| `CoreStack/Type/20/Regular/4`   | 20 / 30 px                       | 400    | Cover context/variables                        |
| `CoreStack/Type/12/Semi Bold/5` | 12 / 18 px                       | 600    | Native + context                               |
| `CoreStack/Type/14/Regular/6`   | 14 / 21 px                       | 400    | Native + context                               |
| `CoreStack/Type/12/Regular/7`   | 12 / 18 px                       | 400    | Native + context                               |
| `CoreStack/Type/24/Semi Bold/8` | 24 / 36 px                       | 600    | Native + context                               |
| `CoreStack/Type/14/Semi Bold/9` | 14 / 21 px                       | 600    | Native + context                               |
| `CoreStack/Type/12/Regular/10`  | 12 px; MCP báo `lineHeight: 100` | 400    | Forms context; unit/native value chưa xác minh |

Phần lớn style dùng line height 150%. Style `/12/Regular/10` là ngoại lệ cần đọc lại native properties khi có quota; không suy ra unit hoặc tự sửa giá trị trong phân tích này.

## 5. Spacing, radius và elevation

| Token        | Giá trị |
| ------------ | ------- |
| `radius/12`  | `12px`  |
| `radius/8`   | `8px`   |
| `spacing/12` | `12px`  |
| `spacing/16` | `16px`  |
| `spacing/24` | `24px`  |
| `spacing/32` | `32px`  |
| `spacing/4`  | `4px`   |
| `spacing/8`  | `8px`   |

- Documentation canvas: padding 48 px, gap 32 px; 48 px đang là literal trong context, chưa xác minh token spacing/48.
- Card: padding 24 px, gap 16 px, radius 12 px, border 1 px `border/default`.
- Badge: padding ngang 8 px, dọc 4 px; radius 8 px; text 12/18 px.
- Button: min-height 40 px; padding ngang 16 px, dọc 10 px; gap 8 px; radius 8 px.
- Navigation item: padding 12 px, gap 12 px, radius 8 px; icon thường 20 px.
- Inline alert: padding 16 px, radius 8 px.
- Switch mẫu: 44 x 24 px, padding 3 px; avatar mẫu 32 x 32 px. Các giá trị này là geometry/literals, không tự thêm tokens mới.
- Elevation mặc định flat; Raised: offset `(0, 4)`, blur 16, spread 0, `rgba(15, 23, 42, 0.07)` trong context. Text Foundations ghi `#0F172A12`.
- Focus ring được mô tả 2–3 px blue; Buttons screenshot có Focus state. Đây là spec cần giữ khi triển khai accessibility.

## 6. Auto Layout và responsive

| Container                      | Hướng / sizing                       | Padding / gap | Ghi chú                             |
| ------------------------------ | ------------------------------------ | ------------- | ----------------------------------- |
| 5 frame tài liệu Design System | Vertical; width Fixed, height Hug    | 48 / 32 px    | Rộng 1440 px                        |
| Card                           | Vertical; width Fill, height Hug     | 24 / 16 px    | Radius 12                           |
| Semantic color tokens          | Horizontal, Wrap; width Fill         | 0 / 16 px     | Swatch specimen rộng 124 px         |
| Documentation rows             | Vertical; Fill/Hug                   | 0 / 12 px     | Đọc trên cover                      |
| Shell specimens                | Horizontal; Fill/Fixed               | 0 / 24 px     | Cao 650 px                          |
| Sidebar expanded/collapsed     | Vertical; Fixed/Fill                 | 20 / 24 px    | Rộng 248 / 72 px                    |
| Topbar specimen                | Horizontal, align center; Fill/Fixed | 0 / 12 px     | Cao 64 px                           |
| Badge family                   | Horizontal; Fill/Hug                 | 0 / 16 px     | Các badge Hug/Hug                   |
| Form specimens                 | Hai card ngang, chia Fill            | gap 24 px     | Input stack gap 8 px                |
| Toast                          | Horizontal; text Fill                | 16 / 12 px    | Rộng mẫu 440 px, Raised             |
| Confirmation dialog specimen   | Vertical; Fill/Hug                   | 24 / 24 px    | Actions ngang, canh phải, gap 12 px |

Grid được mô tả 12 columns, gutter 24 px, content max-width 1280 px, desktop content padding 32 px. Mobile được mô tả rộng 390 px, padding 20 px, form full-width.

Breakpoints được ghi rõ là **[UI PROPOSAL]**: dưới 768 dùng drawer/cards; 768–1199 sidebar collapsed; từ 1200 sidebar expanded. Đây là đề xuất trong thiết kế, chưa phải behavior đã kiểm chứng của Core Base hoặc của toàn bộ product frames. Frame SHARED-05 tồn tại (`4:42441`) nhưng screenshot/context chưa đọc vì quota.

## 7. Component hierarchy và properties

Inventory component đã đọc bằng `use_figma`: 60 COMPONENT và 6 COMPONENT_SET. Các master nằm trong 5 frame mẫu; cover dùng FRAME/TEXT, không có INSTANCE. Không đánh đồng master component với các frame cùng tên `Card`, `Inline alert` hoặc `Status badge`.

### Component sets

| Node ID                                                                                 | Component set    | Variants                                    |
| --------------------------------------------------------------------------------------- | ---------------- | ------------------------------------------- |
| [4:43648](https://www.figma.com/design/w7niXpOtilM8YR13A2nrsF/Untitled?node-id=4-43648) | Button/Primary   | 5: Default, Hover, Focus, Disabled, Loading |
| [4:43654](https://www.figma.com/design/w7niXpOtilM8YR13A2nrsF/Untitled?node-id=4-43654) | Button/Secondary | 5: Default, Hover, Focus, Disabled, Loading |
| [4:43660](https://www.figma.com/design/w7niXpOtilM8YR13A2nrsF/Untitled?node-id=4-43660) | Button/Tertiary  | 5: Default, Hover, Focus, Disabled, Loading |
| [4:43666](https://www.figma.com/design/w7niXpOtilM8YR13A2nrsF/Untitled?node-id=4-43666) | Button/Danger    | 5: Default, Hover, Focus, Disabled, Loading |
| [4:43672](https://www.figma.com/design/w7niXpOtilM8YR13A2nrsF/Untitled?node-id=4-43672) | Button/Ghost     | 5: Default, Hover, Focus, Disabled, Loading |
| [4:43678](https://www.figma.com/design/w7niXpOtilM8YR13A2nrsF/Untitled?node-id=4-43678) | Button/Icon      | 5: Default, Hover, Focus, Disabled, Loading |

Design context của button families trả props `state` và, với button có text, `label`; Button/Icon không có label prop trong code tham chiếu. Chưa đọc lại toàn bộ native property definitions của Forms vì quota; tên prop trong code tham chiếu không thay thế kiểm chứng native keys.

### Component masters

| Node ID                                                                                 | Component                    | Parent / family                     |
| --------------------------------------------------------------------------------------- | ---------------------------- | ----------------------------------- |
| [4:43679](https://www.figma.com/design/w7niXpOtilM8YR13A2nrsF/Untitled?node-id=4-43679) | Navigation/Sidebar/Expanded  | Shell specimens                     |
| [4:43680](https://www.figma.com/design/w7niXpOtilM8YR13A2nrsF/Untitled?node-id=4-43680) | Navigation/Sidebar/Collapsed | Shell specimens                     |
| [4:43681](https://www.figma.com/design/w7niXpOtilM8YR13A2nrsF/Untitled?node-id=4-43681) | Navigation/Item/Default      | Card                                |
| [4:43682](https://www.figma.com/design/w7niXpOtilM8YR13A2nrsF/Untitled?node-id=4-43682) | Navigation/Item/Hover        | Card                                |
| [4:43683](https://www.figma.com/design/w7niXpOtilM8YR13A2nrsF/Untitled?node-id=4-43683) | Navigation/Item/Active       | Card                                |
| [4:43684](https://www.figma.com/design/w7niXpOtilM8YR13A2nrsF/Untitled?node-id=4-43684) | Navigation/Item/Disabled     | Card                                |
| [4:43685](https://www.figma.com/design/w7niXpOtilM8YR13A2nrsF/Untitled?node-id=4-43685) | Badge/Role/Member            | Role badge family                   |
| [4:43686](https://www.figma.com/design/w7niXpOtilM8YR13A2nrsF/Untitled?node-id=4-43686) | Badge/Role/Admin             | Role badge family                   |
| [4:43687](https://www.figma.com/design/w7niXpOtilM8YR13A2nrsF/Untitled?node-id=4-43687) | Badge/Role/SuperAdmin        | Role badge family                   |
| [4:43643](https://www.figma.com/design/w7niXpOtilM8YR13A2nrsF/Untitled?node-id=4-43643) | State=Default                | Button/Primary                      |
| [4:43644](https://www.figma.com/design/w7niXpOtilM8YR13A2nrsF/Untitled?node-id=4-43644) | State=Hover                  | Button/Primary                      |
| [4:43645](https://www.figma.com/design/w7niXpOtilM8YR13A2nrsF/Untitled?node-id=4-43645) | State=Focus                  | Button/Primary                      |
| [4:43646](https://www.figma.com/design/w7niXpOtilM8YR13A2nrsF/Untitled?node-id=4-43646) | State=Disabled               | Button/Primary                      |
| [4:43647](https://www.figma.com/design/w7niXpOtilM8YR13A2nrsF/Untitled?node-id=4-43647) | State=Loading                | Button/Primary                      |
| [4:43649](https://www.figma.com/design/w7niXpOtilM8YR13A2nrsF/Untitled?node-id=4-43649) | State=Default                | Button/Secondary                    |
| [4:43650](https://www.figma.com/design/w7niXpOtilM8YR13A2nrsF/Untitled?node-id=4-43650) | State=Hover                  | Button/Secondary                    |
| [4:43651](https://www.figma.com/design/w7niXpOtilM8YR13A2nrsF/Untitled?node-id=4-43651) | State=Focus                  | Button/Secondary                    |
| [4:43652](https://www.figma.com/design/w7niXpOtilM8YR13A2nrsF/Untitled?node-id=4-43652) | State=Disabled               | Button/Secondary                    |
| [4:43653](https://www.figma.com/design/w7niXpOtilM8YR13A2nrsF/Untitled?node-id=4-43653) | State=Loading                | Button/Secondary                    |
| [4:43655](https://www.figma.com/design/w7niXpOtilM8YR13A2nrsF/Untitled?node-id=4-43655) | State=Default                | Button/Tertiary                     |
| [4:43656](https://www.figma.com/design/w7niXpOtilM8YR13A2nrsF/Untitled?node-id=4-43656) | State=Hover                  | Button/Tertiary                     |
| [4:43657](https://www.figma.com/design/w7niXpOtilM8YR13A2nrsF/Untitled?node-id=4-43657) | State=Focus                  | Button/Tertiary                     |
| [4:43658](https://www.figma.com/design/w7niXpOtilM8YR13A2nrsF/Untitled?node-id=4-43658) | State=Disabled               | Button/Tertiary                     |
| [4:43659](https://www.figma.com/design/w7niXpOtilM8YR13A2nrsF/Untitled?node-id=4-43659) | State=Loading                | Button/Tertiary                     |
| [4:43661](https://www.figma.com/design/w7niXpOtilM8YR13A2nrsF/Untitled?node-id=4-43661) | State=Default                | Button/Danger                       |
| [4:43662](https://www.figma.com/design/w7niXpOtilM8YR13A2nrsF/Untitled?node-id=4-43662) | State=Hover                  | Button/Danger                       |
| [4:43663](https://www.figma.com/design/w7niXpOtilM8YR13A2nrsF/Untitled?node-id=4-43663) | State=Focus                  | Button/Danger                       |
| [4:43664](https://www.figma.com/design/w7niXpOtilM8YR13A2nrsF/Untitled?node-id=4-43664) | State=Disabled               | Button/Danger                       |
| [4:43665](https://www.figma.com/design/w7niXpOtilM8YR13A2nrsF/Untitled?node-id=4-43665) | State=Loading                | Button/Danger                       |
| [4:43667](https://www.figma.com/design/w7niXpOtilM8YR13A2nrsF/Untitled?node-id=4-43667) | State=Default                | Button/Ghost                        |
| [4:43668](https://www.figma.com/design/w7niXpOtilM8YR13A2nrsF/Untitled?node-id=4-43668) | State=Hover                  | Button/Ghost                        |
| [4:43669](https://www.figma.com/design/w7niXpOtilM8YR13A2nrsF/Untitled?node-id=4-43669) | State=Focus                  | Button/Ghost                        |
| [4:43670](https://www.figma.com/design/w7niXpOtilM8YR13A2nrsF/Untitled?node-id=4-43670) | State=Disabled               | Button/Ghost                        |
| [4:43671](https://www.figma.com/design/w7niXpOtilM8YR13A2nrsF/Untitled?node-id=4-43671) | State=Loading                | Button/Ghost                        |
| [4:43673](https://www.figma.com/design/w7niXpOtilM8YR13A2nrsF/Untitled?node-id=4-43673) | State=Default                | Button/Icon                         |
| [4:43674](https://www.figma.com/design/w7niXpOtilM8YR13A2nrsF/Untitled?node-id=4-43674) | State=Hover                  | Button/Icon                         |
| [4:43675](https://www.figma.com/design/w7niXpOtilM8YR13A2nrsF/Untitled?node-id=4-43675) | State=Focus                  | Button/Icon                         |
| [4:43676](https://www.figma.com/design/w7niXpOtilM8YR13A2nrsF/Untitled?node-id=4-43676) | State=Disabled               | Button/Icon                         |
| [4:43677](https://www.figma.com/design/w7niXpOtilM8YR13A2nrsF/Untitled?node-id=4-43677) | State=Loading                | Button/Icon                         |
| [4:43688](https://www.figma.com/design/w7niXpOtilM8YR13A2nrsF/Untitled?node-id=4-43688) | Input/text/Default           | Card                                |
| [4:43689](https://www.figma.com/design/w7niXpOtilM8YR13A2nrsF/Untitled?node-id=4-43689) | Input/email/Focus            | Card                                |
| [4:43690](https://www.figma.com/design/w7niXpOtilM8YR13A2nrsF/Untitled?node-id=4-43690) | Input/password/Default       | Card                                |
| [4:43691](https://www.figma.com/design/w7niXpOtilM8YR13A2nrsF/Untitled?node-id=4-43691) | Input/password/Error         | Card                                |
| [4:43692](https://www.figma.com/design/w7niXpOtilM8YR13A2nrsF/Untitled?node-id=4-43692) | Input/search/Default         | Card                                |
| [4:43693](https://www.figma.com/design/w7niXpOtilM8YR13A2nrsF/Untitled?node-id=4-43693) | Input/select/Default         | Card                                |
| [4:43694](https://www.figma.com/design/w7niXpOtilM8YR13A2nrsF/Untitled?node-id=4-43694) | Switch/On/Default            | Switch family                       |
| [4:43695](https://www.figma.com/design/w7niXpOtilM8YR13A2nrsF/Untitled?node-id=4-43695) | Switch/Off/Default           | Switch family                       |
| [4:43696](https://www.figma.com/design/w7niXpOtilM8YR13A2nrsF/Untitled?node-id=4-43696) | Switch/On/Disabled           | Switch family                       |
| [4:43697](https://www.figma.com/design/w7niXpOtilM8YR13A2nrsF/Untitled?node-id=4-43697) | Checkbox/Checked             | Card                                |
| [4:43698](https://www.figma.com/design/w7niXpOtilM8YR13A2nrsF/Untitled?node-id=4-43698) | Checkbox/Unchecked           | Card                                |
| [4:43699](https://www.figma.com/design/w7niXpOtilM8YR13A2nrsF/Untitled?node-id=4-43699) | File/Dropzone/Default        | Card                                |
| [4:43700](https://www.figma.com/design/w7niXpOtilM8YR13A2nrsF/Untitled?node-id=4-43700) | Table/Users                  | Card                                |
| [4:43701](https://www.figma.com/design/w7niXpOtilM8YR13A2nrsF/Untitled?node-id=4-43701) | Table/Users/Mobile card      | Users mobile cards                  |
| [4:43702](https://www.figma.com/design/w7niXpOtilM8YR13A2nrsF/Untitled?node-id=4-43702) | Tooltip/Permission           | Card                                |
| [4:43703](https://www.figma.com/design/w7niXpOtilM8YR13A2nrsF/Untitled?node-id=4-43703) | Skeleton/Loading             | Card                                |
| [4:43704](https://www.figma.com/design/w7niXpOtilM8YR13A2nrsF/Untitled?node-id=4-43704) | Toast/Success                | Card                                |
| [4:43705](https://www.figma.com/design/w7niXpOtilM8YR13A2nrsF/Untitled?node-id=4-43705) | Progress/Indeterminate       | Card                                |
| [4:43706](https://www.figma.com/design/w7niXpOtilM8YR13A2nrsF/Untitled?node-id=4-43706) | Toast/Error                  | 01 Design System / Data & feedback  |
| [4:43707](https://www.figma.com/design/w7niXpOtilM8YR13A2nrsF/Untitled?node-id=4-43707) | Button/Secondary/Default     | Card                                |
| [4:43708](https://www.figma.com/design/w7niXpOtilM8YR13A2nrsF/Untitled?node-id=4-43708) | Dialog/RevokeSession         | 01 Design System / Security & files |

Native properties đã xác minh trên Shell & navigation:

| Component                      | Native property                                           |
| ------------------------------ | --------------------------------------------------------- |
| `Navigation/Sidebar/Expanded`  | `Label#4:36`: TEXT, default `Quản trị viên`               |
| `Navigation/Sidebar/Collapsed` | Không có property definitions                             |
| `Navigation/Item/Default`      | `Label#4:37`: TEXT, default `Người dùng • Default`        |
| `Navigation/Item/Hover`        | `Label#4:38`: TEXT, default `Người dùng • Hover`          |
| `Navigation/Item/Active`       | `Label#4:39`: TEXT, default `Người dùng • Active`         |
| `Navigation/Item/Disabled`     | `Label#4:40`: TEXT, default `Người dùng • Không khả dụng` |
| `Badge/Role/Member`            | `Label#4:41`: TEXT, default `Thành viên`                  |
| `Badge/Role/Admin`             | `Label#4:42`: TEXT, default `Quản trị viên`               |
| `Badge/Role/SuperAdmin`        | `Label#4:43`: TEXT, default `Siêu quản trị viên`          |

`Label#...` là key do Figma tạo, chỉ là snapshot. Không hardcode suffix khi tạo hoặc ánh xạ property.

## 8. Nội dung đã kiểm chứng theo frame

### Foundations - 4:39987

Semantic palette; typography specimens; spacing/radius/elevation; grid 12 columns và responsive proposal. Native inspection đếm 26 FRAME, 33 TEXT, 27 RECTANGLE.

### Shell & navigation - 4:40074

Sidebar expanded/collapsed; navigation Default/Hover/Active/Disabled; topbar có avatar/dropdown; 3 role badges; profile dropdown có tài khoản/đăng xuất. Native inspection đếm 26 FRAME, 26 TEXT, 9 COMPONENT, 14 VECTOR, 3 RECTANGLE. Sidebar ẩn entry thiếu quyền; ADMIN không thấy email policy hoặc cấp/gỡ ADMIN.

### Forms & buttons - 4:40139

6 button families x 5 states; text/email/password/search/select inputs; password visibility icon; confirm-password error; switch on/off/disabled; checkbox; filter chip; file picker/dropzone. Button height 40, radius 8; loading ngăn submit lặp. Password helper ghi 12–128 ký tự. Dropzone ghi tối đa 5 MiB/tệp. Screenshot thể hiện đầy đủ states; không dùng code tham chiếu làm triển khai nguyên xi.

### Data & feedback - 4:40287

Users table và mobile card; status/permission badges; copy field; tooltip; skeleton; empty state; success/error inline alerts và toasts; progress indeterminate. Không hiển thị phần trăm nếu client không đo được. Chưa đọc Product drawers để chốt nội dung chi tiết.

### Security & files - 4:40368

Session card có ID, created/expires dates và current-device badge; audit specimen với action/outcome/metadata; verified/unverified badges; file icons PDF/PNG/other; quota 2/10, tối đa 5 MiB/tệp; revoke-session confirmation. Ghi chú nêu private per-user, upload trùng tên tạo record mới; thu hồi phiên hiện tại chuyển về login. Những nội dung này đã đọc từ DS context/screenshot, không phải suy ra từ tên product frame.

## 9. Đối chiếu frontend và tái sử dụng

| Thành phần          | Core Base hiện tại                                                                                                                                                                        | Hướng áp dụng sau khi xác nhận                                                                                      |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Tokens/fonts        | [globals.css](../../frontend/src/app/globals.css), [layout.tsx](../../frontend/src/app/layout.tsx): A.1 đã áp Inter, semantic tokens, headings và focus; có aliases cho markup feature cũ | Tiếp tục migrate presentation qua primitives khi có consumer thực tế                                                |
| Shell/navigation    | A.3: [AuthNavigation](../../frontend/src/features/auth/components/auth-navigation.tsx) bọc children bằng AppShell/Sidebar; topbar account popover và mobile dialog drawer                 | Giữ roles/permissions/routes; geometry DS và runtime đã verify; breakpoint/drawer visual là UI PROPOSAL, xem mục 14 |
| Role dashboard      | [RoleDashboard](../../frontend/src/features/auth/components/role-dashboard.tsx) đã có role gate và navigation cards                                                                       | Giữ dữ liệu và điều hướng; layout Product còn phải đọc                                                              |
| Forms               | LoginForm/RegisterForm dùng React Hook Form + Zod và Button/Input/InlineAlert A.2; GoogleLoginButton giữ nguyên                                                                           | Validation/hook/API không đổi; password visibility chỉ là state presentation                                        |
| Cards/badges/alerts | A.2 có shared primitives tại `frontend/src/components/ui/`; Card dùng ở hai auth page, RoleBadge dùng ở navigation                                                                        | Chỉ migrate consumer đã xác minh; markup feature khác giữ nguyên, business logic ở feature                          |
| Users/mobile card   | AdminUsers có table và overflow-x; chưa có mobile card hay drawer                                                                                                                         | Dùng dữ liệu list đã tải; đọc ADM-02 để chốt fields/interactions                                                    |
| Audit               | AdminAuditLogs có table/empty/load-more; chưa có filter controls hoặc details drawer                                                                                                      | Giữ useInfiniteQuery; đọc ADM-03 và đối chiếu filter API                                                            |
| Session/dialog      | AccountPanel revoke trực tiếp, ẩn action cho current session                                                                                                                              | Đối chiếu DS confirmation/current-session behavior; đọc MEM-03 trước khi sửa                                        |
| File picker         | MarkdownFileManager dùng file input, preview, download, browser confirm delete                                                                                                            | Dropzone/dialog/status có thể bổ sung; đọc MEM-04 trước khi chốt flow                                               |

Frontend dùng Next.js 15.5.25, React 19.1, Tailwind 4, React Query, React Hook Form, Zod và Axios. Chưa cần thêm UI dependency chỉ để áp những mẫu đã đọc. Không tạo repository/helper/backend abstraction cho thay đổi presentation.

DS context có SVG assets cho icons như layers, users, loader, copy, file, eye. Khi triển khai, tải và giữ đúng asset/slot đã chỉ định; không để URL asset MCP tạm trong code. Bước phân tích này chưa tải assets để triển khai.

Trình tự triển khai màn hình Product tạm thời; chỉ bắt đầu phần màn hình này sau khi đọc đủ Product & Handoff và người dùng xác nhận. Shared Design System A.1 đã được người dùng cho phép riêng, xem mục 12:

1. Chốt screens, states, route grouping và API/permission từ context Product cùng handoff; giải quyết những khác biệt với source trước khi code.
2. Áp semantic tokens/typography, rồi shell/navigation; tái sử dụng AuthProvider, role/permission checks và routes hiện tại.
3. Tạo Button, Input, Card, Badge, InlineAlert và confirmation dialog khi có consumer thực tế; giữ form validation và business behavior trong feature.
4. Triển khai từng nhóm Auth → Account/Sessions/Files → Users/Audit → System. Tái sử dụng hooks/API hiện có; file replace phải nhận ID mới, filters chỉ dùng contract đã xác minh.
5. Kiểm tra các state đã chốt, keyboard/focus, responsive và role/permission; chạy checks phù hợp của frontend và đối chiếu screenshot của từng screen.

## 10. Phần còn phải đọc và cách tiếp tục

1. Khôi phục khả năng đọc MCP với hạn mức đủ cho các nhóm còn lại; bắt đầu từ `4:40414`. Chỉ lấy lại `whoami` không khôi phục quota.
2. Theo thứ tự section 02, 03, 04, 05, 06, 07, lấy design context có screenshot cho frame trong inventory SCREEN_MAPPING. Không cần người dùng cung cấp link từng frame.
3. Nếu context sparse/chỉ metadata, duyệt child IDs và đọc context của các child hiển thị; nếu thiếu screenshot, gọi get_screenshot. Chỉ đánh dấu thành công sau khi có chi tiết và đã kiểm tra hình.
4. Đọc native properties/variables còn thiếu của Forms/Data/Security và kiểm chứng ngoại lệ typography; gom tokens dùng thực tế, không đánh dấu đã có full variable dump.
5. Đối chiếu Product/Developer Handoff thật với mapping tạm từ source; chốt route/state/permission trước khi lập kế hoạch sửa ứng dụng.

## 11. Kiểm tra của bước tài liệu

Đã đọc AGENTS.md và source routes/services/frontend; đã kiểm tra HEAD và worktree. Chỉ tạo DESIGN_SYSTEM.md và SCREEN_MAPPING.md. Không chạy ứng dụng/API thực tế; không chạy lint/typecheck/test/build cho thay đổi tài liệu. Không sửa Figma, code ứng dụng, dependency, schema hoặc roadmap tính năng.

Kiểm tra tài liệu đã chạy: `git diff --check` và script Node inline dùng `node:assert/strict` đều pass. Script xác nhận 81 frame IDs duy nhất cùng tên/kích thước khớp dữ liệu MCP, trạng thái 6/1/74, mapping bao phủ 81 frame, 32 dòng mapping, 22 API, đủ 11 route frontend, 60 component masters/6 sets, 48 liên kết local hợp lệ, bảng Markdown có số cột nhất quán và không có trailing whitespace. `git diff --no-index --check -- /dev/null <file>` cho từng tài liệu không báo lỗi whitespace; exit code 1 vì file mới khác file rỗng.

## 12. Phase A.1 - Foundations & shared layout

Ngày triển khai: 2026-10-08. **A.1 đã implement và verify.** Phần UI primitives tiếp tục ở A.2, mục 13. Không có lần đọc Product MCP mới; inventory và trạng thái 6/1/74 giữ nguyên.

| Hạng mục            | Bằng chứng Design System                                                                                          | Triển khai A.1                                                                                                                                                         |
| ------------------- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Font/typography     | Foundations `4:39987` và Shell `4:40074`: Inter, 400/600, tracking 0, line height 150%                            | `next/font/google` self-host Inter với subsets latin/vietnamese; body 16/24, h1 32/48, h2 24/36, h3 20/30; Tailwind xs/sm/base/xl/2xl/3xl dùng thang đã xác minh       |
| Colors              | 5 DS contexts: semantic palette; Forms `4:40139` có hover blue; status foreground được chỉ định trong Foundations | CSS variables và Tailwind semantic utilities; success/warning text dùng foreground đủ contrast; aliases ink/paper/signal/acid/line giữ markup cũ hoạt động             |
| Spacing/radius      | Foundations: 4/8/12/16/24/32, radius 8/12; Shell item padding 12                                                  | CSS spacing/radius variables; navigation item dùng padding 12/radius 8; radius 12 được khai báo, chưa migrate Card cũ                                                  |
| Shared container    | Foundations: content max-width 1280, desktop gutter/padding 32, mobile padding 20                                 | Container width 100%, max-width 1280; horizontal gutter clamp 20–32; giữ vertical spacing, grid và nội dung của feature hiện tại                                       |
| Navigation          | Shell có styles Default/Active/Hover và topbar 64                                                                 | Restyle header đang có; min-height 64 để menu wrap không bị cắt; dùng nguyên getNavigationItems, role labels, hrefs và aria-current; chưa thêm sidebar/drawer/dropdown |
| Focus/accessibility | Foundations/Forms mô tả focus ring blue 2–3px                                                                     | Outline 2px; skip link focus vào content; `:has()` cho label chứa file input ẩn; chữ hover/active trên blue chuyển sang white; bỏ focus shadow orange cũ               |

Ánh xạ h1/h2/h3 và gutter co giãn là quyết định triển khai dựa trên thang DS đã xác minh, không phải layout đọc từ Product frames. `5vw` trong clamp là cách nội suy của CSS, không phải breakpoint/token Figma. Frame tài liệu 1440px, specimen height 650px và breakpoint proposal 768/1200 không được dùng làm kích thước cố định hay behavior mới của ứng dụng.

Shared container dùng HTML/CSS trực tiếp trong layout hiện có; không thêm state, component wrapper một consumer, UI dependency, backend repository hoặc abstraction mới. AuthProvider, providers, hooks, API clients, RBAC helpers và backend giữ nguyên. Login/Register/AccountPanel chỉ đổi class presentation để giữ contrast/focus khi legacy aliases chuyển sang blue; form schema, handlers và mutations không đổi.

Kiểm tra thực tế:

- Trong `frontend/`: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` đều pass. Test suite: 6 file, 29 cases, gồm 11 cases contrast mới trong [design-system.test.ts](../../frontend/src/app/tests/design-system.test.ts), yêu cầu WCAG AA 4.5:1 cho các cặp semantic text/background được khai báo.
- Chrome headless qua Node/CDP built-in trên production build: 30 trường hợp cho `/login`, `/register`, `/account`, `/account/files`, `/admin`, `/super-admin`, mỗi route ở 320/390/768/1280/1600px; kiểm tra width/max-width, overflow, font/colors/heading và menu role/current link. Đã xem screenshots login 390 và admin 1280 để kiểm tra presentation hiện có.
- Keyboard: Tab/Enter trên skip link cho guest và authenticated, focus input email, focus label của file input ẩn. AX tree xác nhận main landmark và accessible name của email field. Tên tài khoản dài không có khoảng trắng đã gây overflow, được sửa bằng `overflow-wrap: anywhere` và kiểm tra lại pass.
- Browser requests dùng API fixtures tại phiên kiểm tra, không gọi nghiệp vụ hoặc thay dữ liệu backend thật; đây không phải integration test auth/RBAC với server thật hoặc nghiệm thu visual của Product frames.

Phần chưa triển khai/xác minh:

- Card/Input/Button presentation cũ ở các feature ngoài consumer A.2 còn các kích thước, tracking, borders, shadows và một số literal colors. Không migrate toàn bộ frontend; chưa xác nhận pixel fidelity của bất kỳ Product screen nào.
- 75 Product & Handoff frames vẫn chưa có context/screenshot. Chưa chốt route/state/layout mới từ những tên frame đó.
- Full variable dump, native properties bổ sung của Forms/Data/Security và unit line-height của style `/12/Regular/10` còn thiếu do quota; không dùng giá trị `100` chưa xác minh này.

## 13. Phase A.2 - Shared UI Primitives

Ngày triển khai: 2026-10-08. **DONE: implementation và verification A.2. PARTIAL: đối chiếu visual chi tiết. BLOCKED: Product/native inspections/assets chưa đọc thêm được vì quota.** Không gọi thêm Figma MCP, không thay inventory hoặc mapping Product.

| Hạng mục                            | Trạng thái | Phạm vi                                                                                                              |
| ----------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------- |
| Primitives và states                | DONE       | Đã viết và verify đủ các primitives được yêu cầu; semantic tokens A.1 và geometry đã ghi trong tài liệu này          |
| Áp dụng vào source                  | DONE       | Chỉ auth forms, Card của hai auth page và RoleBadge trong navigation; giữ handlers/hooks/API/schemas/permissions     |
| Đối chiếu visual chi tiết           | PARTIAL    | Không có per-state CSS đầy đủ, per-role colors hoặc assets gốc trong snapshot tài liệu; chưa xác nhận pixel fidelity |
| Product & Handoff                   | BLOCKED    | 75 frames chưa có screenshot/context vì quota; không triển khai screens từ tên/mapping tạm                           |
| Native properties/variables bổ sung | BLOCKED    | Full variable dump, typography exception và chi tiết Forms/Data/Security chưa đọc thêm được                          |

### Components và reuse

Không tìm thấy primitives dùng chung trước A.2. Các file dưới đây tạo mới trong `frontend/src/components/ui/`; không tạo barrel, variant factory, global toast store hoặc dependency UI.

| File / component                                                                          | Triển khai                                                                                                                                                                                                | Consumer hiện tại                                                                         |
| ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| [button.tsx](../../frontend/src/components/ui/button.tsx) / Button                        | Primary/secondary/tertiary/danger/ghost/icon; hover CSS, focus-visible A.1; disabled native; loading khóa tương tác và `aria-busy`; icon yêu cầu accessible label; mặc định `type="button"`               | LoginForm, RegisterForm; actions trong primitives khác                                    |
| [input.tsx](../../frontend/src/components/ui/input.tsx) / Input                           | Text/email/password/search và `type="select"` render native select với children options; labels/useId, hint/error/aria-invalid/aria-describedby; native refs; password toggle không submit                | LoginForm, RegisterForm; giữ nguyên React Hook Form/Zod                                   |
| [card.tsx](../../frontend/src/components/ui/card.tsx) / Card                              | Native div, flat border, padding 24/gap 16/radius 12                                                                                                                                                      | Card đang có ở login/register; giữ content và outer page composition                      |
| [role-badge.tsx](../../frontend/src/components/ui/role-badge.tsx) / RoleBadge             | MEMBER/ADMIN/SUPER_ADMIN; default labels từ native DS, có children override; padding 4/8, radius 8, type 12/18; không kiểm tra quyền                                                                      | AuthNavigation override bằng roleLabel hiện có; giữ getRoleFlags/getNavigationItems/hrefs |
| [controls.tsx](../../frontend/src/components/ui/controls.tsx) / Checkbox, Switch          | Native checkbox; switch thêm `role="switch"` và geometry 44 x 24/padding 3; controlled/uncontrolled, keyboard, form name/value và disabled native                                                         | Component/browser tests; chưa áp vào system policy hoặc Product UI                        |
| [feedback.tsx](../../frontend/src/components/ui/feedback.tsx) / InlineAlert, Toast        | Success `role="status"`, error `role="alert"`, atomic announcement; toast có nút dismiss với tên truy cập và callback rõ ràng; không auto-dismiss                                                         | InlineAlert trong auth forms; Toast chỉ có test consumer                                  |
| [confirm-dialog.tsx](../../frontend/src/components/ui/confirm-dialog.tsx) / ConfirmDialog | Parent điều khiển open/loading/onConfirm/onClose; native showModal/inert/top layer, vòng Tab/Shift+Tab, Escape, initial focus vào Cancel và restore trigger khi đóng/unmount; loading đưa focus về Cancel | Component/browser tests; chưa thay revoke-session hoặc browser confirm delete             |
| [feedback.tsx](../../frontend/src/components/ui/feedback.tsx) / Skeleton, Progress        | Skeleton decorative/aria-hidden và giảm animation theo reduced-motion; native progress không truyền value/max, không hiển thị phần trăm                                                                   | Component/browser tests; chưa thay loading behavior của feature khác                      |

Các component chưa có product consumer vẫn nằm trong scope vì người dùng yêu cầu trực tiếp bộ primitives A.2; test fixture là consumer để kiểm tra tương tác, không phải route/màn hình ứng dụng. Native controls và state local là phần reuse của platform; Inter/tokens/focus ring là phần reuse A.1.

### Tokens và giới hạn visual

[primitives.css](../../frontend/src/components/ui/primitives.css) dùng semantic variables. [globals.css](../../frontend/src/app/globals.css) chỉ bổ sung aliases từ palette đã ghi: danger hover/text `#b91c1c`, surface success `#f0fdf4`, surface danger `#fef2f2`, Raised `0 4px 16px #0f172a12`. Text danger trên surface danger dùng shade đậm để đạt WCAG AA. Không thêm màu ngoài palette đã xác minh hoặc token geometry mới.

- Button dùng min-height 40, padding 10/16, gap/radius 8; Card dùng padding 24/gap 16/radius 12; InlineAlert dùng padding 16/radius 8; Toast dùng sample width 440, padding 16/gap 12 và Raised; dialog dùng padding/gap 24, actions gap 12. Typography dùng thang 150% A.1, không dùng line-height `100` chưa biết unit.
- Snapshot tài liệu xác nhận families/states và palette, nhưng không lưu đủ CSS cho từng state. Các phép gán semantic palette cho secondary/tertiary/ghost, opacity disabled, input styling và native checkbox/select/progress là baseline triển khai; không đánh dấu chúng là pixel-exact Figma. Badge dùng neutral semantic surface; per-role color styles còn PARTIAL và được ghi bằng `ponytail:` trong CSS.
- Geometry thumb/spinner, cap 440px của dialog và cách wrap trên mobile là quyết định triển khai để giữ nội dung truy cập được, không phải token/breakpoint mới được đọc từ Figma. Backdrop dùng mặc định của native dialog.
- Chưa có asset SVG gốc được lưu cục bộ. Password toggle dùng Show/Hide có accessible name, dismiss dùng Close; loading dùng CSS spinner, icon button nhận children từ consumer. Không vẽ icon thay thế rồi tuyên bố là asset Figma, không dùng URL MCP tạm.

### Flow và scope

`GET /login` hoặc `/register` → page composition → Card → LoginForm/RegisterForm → Input/InlineAlert/Button. Password visibility chỉ thay `type` trình bày của input, không thay value/schema.

`POST /api/v1/auth/login` → useLogin → auth.api/Axios → auth.routes → validateBody(loginSchema) → authController.login → authService.login → createAuthSession/Prisma → response/cookie → auth.api gọi GET /auth/me → AuthProvider/điều hướng hiện có.

`POST /api/v1/auth/register` → useRegister → auth.api/Axios → auth.routes → validateBody(registerSchema) → authController.register → authService.register → Prisma → response. Các flow trên giữ nguyên; business logic vẫn ở backend service. Không thêm repository hoặc wrapper orchestration.

### Verification

Các lệnh chạy trong `frontend/` qua Corepack vì máy không có `pnpm.cmd` trên PATH:

```bash
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
node src/components/ui/tests/primitives.browser-check.mjs http://127.0.0.1:3001
```

Bốn lệnh pnpm trên đều **PASS** trên source hoàn tất: lint không có warning, typecheck pass, 50 tests trong 7 files pass, production build pass với 15 static pages. `git diff --check` tại root pass. Chrome **PASS** interactive checks với source primitives mới qua Vite có sẵn trong Vitest, không cài thêm package; production app dùng `corepack pnpm start --port 3001`.

- [primitives.test.tsx](../../frontend/src/components/ui/tests/primitives.test.tsx): 16 contract cases cho variants/loading/disabled, label/error/hint IDs, password/select semantics, controls, live regions, dialog và indeterminate progress. Render SSR bằng React DOM có sẵn; không giả lập keyboard/focus bằng markup test.
- [design-system.test.ts](../../frontend/src/app/tests/design-system.test.ts): bổ sung 5 cặp contrast cho các semantic surfaces/foreground mới và danger buttons; giữ 11 cases A.1.
- [primitives.browser-check.mjs](../../frontend/src/components/ui/tests/primitives.browser-check.mjs) và [browser-fixture.tsx](../../frontend/src/components/ui/tests/browser-fixture.tsx): native refs, 6 button families loading/disabled/keyboard, hover primary, password reveal giữ value và không submit, checkbox/switch Space và disabled labels, native select, toast dismiss, confirm loading/Tab/Escape/focus restore, AX tree và reduced-motion Skeleton.
- Responsive fixture ở 320/390/768/1280/1600px; dialog wrap/overflow/focus ở cả 5 độ rộng. Production `/login`, `/register`, `/account`, `/admin`, `/super-admin` ở cùng 5 độ rộng: 25 route/width cases; có tên tài khoản dài, guest và cả 3 roles. Login/register pending request chỉ gửi một lần dù click lặp hoặc Enter; sau response lỗi, Button hết loading và lỗi được announce.
- Đã xem screenshots login/register 390px, admin 1280px và dialog fixture 390px; đây là kiểm tra source UI hiện có, không phải nghiệm thu visual Product. API requests dùng CDP fixtures; không gọi nghiệp vụ hoặc thay dữ liệu backend thật, không thay thế integration test auth/RBAC với server.

Không có primitive chức năng nào trong danh sách yêu cầu bị bỏ qua. Phần chưa làm là assets/đối chiếu visual còn thiếu và áp vào Product chưa được đọc; GoogleLoginButton, session/file confirmations, users/audit/system UI giữ phạm vi hiện có.

## 14. Phase A.3 - App Shell & Role-based Navigation

Ngày triển khai: 2026-10-08. Nguồn thiết kế là Shell & navigation `4:40074` đã đọc; không gọi thêm MCP hoặc tăng số frame DETAIL_OK.

| Phần                        | Trạng thái            | Bằng chứng / giới hạn                                                                                                                                         |
| --------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Geometry và semantic tokens | VERIFIED              | Sidebar 248/72, padding 20/gap 24; topbar 64; avatar 32; item padding/gap 12, radius 8, marker slot 20; tokens A.1                                            |
| Role navigation và keyboard | VERIFIED              | Mapping hiện có; exact active route, labels khi collapse, hover/focus-visible, disabled không có href/tab stop; Chrome và component tests                     |
| Session/logout và drawer    | VERIFIED              | AuthProvider/hooks/API giữ nguyên; Chrome kiểm tra refresh thành công/thất bại, pending logout, Escape/Tab/focus restore và đóng drawer khi navigation/resize |
| Responsive visual           | PARTIAL / UI PROPOSAL | <768 drawer, 768–1199 collapsed, >=1200 expanded; đã kiểm tra runtime/overflow, chưa xác nhận Product responsive Figma hoặc SHARED-05 `4:42441`               |
| Icon/avatar/badge visual    | PARTIAL               | Text markers/monogram và neutral RoleBadge; chưa có assets gốc/per-role colors; không tuyên bố pixel fidelity                                                 |
| Product & Handoff           | BLOCKED               | 75 frame chưa có context/screenshot do quota; không triển khai nội dung Product                                                                               |

[app-shell.tsx](../../frontend/src/components/app-shell.tsx) tạo AppShell và Sidebar trong một file: desktop sidebar, topbar, content và mobile native dialog. [app-shell.css](../../frontend/src/components/app-shell.css) dùng tokens A.1, breakpoint có comment UI PROPOSAL; collapsed item dùng padding ngang 4 để vừa cột 72 với sidebar padding 20. Điều chỉnh này, account popover width cap 288/top offset 72 và text fallback là quyết định triển khai, chưa phải chi tiết CSS được xác minh từ Figma.

[AuthNavigation](../../frontend/src/features/auth/components/auth-navigation.tsx) tái sử dụng `getNavigationItems`, `getRoleFlags`, `getPostLoginPath`, AuthProvider, Button, RoleBadge và LogoutButton. [Providers](../../frontend/src/app/providers.tsx) đưa children qua AuthNavigation; guest/public routes giữ children trực tiếp. RootLayout và skip link đến `#main-content` giữ nguyên. RoleDashboard và content các route giữ nguyên; không thêm layout framework, hook dùng một lần, dependency hoặc repository.

| Entry                        | Gate hiện có, không thay đổi       |
| ---------------------------- | ---------------------------------- |
| `/account`, `/account/files` | User đã khôi phục từ AuthProvider  |
| `/admin`                     | ADMIN, khi không có SUPER_ADMIN    |
| `/super-admin`               | SUPER_ADMIN, ưu tiên hơn ADMIN     |
| `/admin/users`               | `users:read`, không suy ra từ role |
| `/admin/audit-logs`          | `audit:read`, không suy ra từ role |

Không thêm menu/route riêng cho sessions, email policy hoặc quản lý role. EmailVerificationSetting tiếp tục ở `/super-admin`; cấp/gỡ ADMIN tiếp tục trong AdminUsers, dùng gate hiện có. ADMIN không có entry SUPER_ADMIN hoặc menu riêng cho hai chức năng này. Backend vẫn thực thi quyền cuối cùng.

Drawer dùng `showModal()` với initial focus vào Close, Tab/Shift+Tab cycling, Escape, focus restore, đóng khi chọn route và khi resize từ mobile lên >=768. Dropdown dùng `popover="auto"` và Button `popoverTarget`; native platform xử lý keyboard/Escape/light-dismiss. Không gắn `role="menu"` cho nhóm link/button không có arrow-key menu semantics.

Request flow giữ nguyên:

```text
POST /api/v1/auth/refresh → session.routes → sessionController.refresh
→ sessionService.refresh → Prisma → cookie/token response
→ GET /api/v1/auth/me → authenticate → sessionController.me
→ sessionService.me → Prisma/access context → AuthProvider
→ AuthNavigation → getNavigationItems → Sidebar/AppShell

LogoutButton → useLogout → POST /api/v1/auth/logout → session.routes
→ sessionController.logout → sessionService.logout → Prisma → response
→ clear auth/query cache → router.replace('/login')
```

Verification trong `frontend/`: `corepack pnpm lint`, `corepack pnpm typecheck`, `corepack pnpm test`, `corepack pnpm build` đều PASS; 55 tests/8 files, 15 static pages. [app-shell.test.tsx](../../frontend/src/components/tests/app-shell.test.tsx) thêm 5 cases: guest/public content, 3 role mappings và exact active leaf/disabled accessibility. Không thêm test API/backend trùng với suite hiện có vì không đổi contract.

[primitives.browser-check.mjs](../../frontend/src/components/ui/tests/primitives.browser-check.mjs) mở rộng runner Chrome/CDP đã có; chạy trên production bằng `corepack pnpm start --port 3002` và `node src/components/ui/tests/primitives.browser-check.mjs http://127.0.0.1:3002`. PASS: 25 route/width cases ở 320/390/768/1280/1600, sidebar/topbar/avatar geometry, hover/keyboard/focus-visible/ARIA, skip link, drawer focus/Escape/close/route/resize, account popover keyboard/light-dismiss/account link, long name/email overflow, 6 role-permission combinations trên mobile/desktop, 3 role session refresh thành công/thất bại và logout pending/completion. Giữ regression A.2 cho primitives và auth double-submit/error recovery. API dùng fixtures; không thay thế integration backend thật.

Đã xem screenshots admin expanded 1280, drawer 390 và account dropdown/collapsed sidebar 768. Đây là kiểm tra UI source, không phải bằng chứng visual Product. A.3 ghi nhận EmailVerificationSetting nằm ngoài guard của RoleDashboard. **Đã sửa trong A.4:** setting là children của RoleDashboard, chỉ mount sau loading/user/SUPER_ADMIN guard; regression tests và Chrome xác nhận không gọi API cấu hình khi chưa đủ quyền. Giữ API/hooks/backend authorization; không thêm bằng chứng visual Figma hoặc đổi inventory.

## 15. Phase B.1 - Public & Auth

Ngày triển khai: 2026-10-09 (Asia/Saigon). **17/17 frame chức năng VERIFIED, visual VISUAL_PARTIAL.** Danh sách từng frame/route/trigger ở [SCREEN_MAPPING.md](SCREEN_MAPPING.md), mục 13. Không có chức năng B.1 BLOCKED.

### Visual và primitives

[auth-page.tsx](../../frontend/src/features/auth/components/auth-page.tsx) dùng chung AuthPage/AuthStateCard cho Login/Register/Verify/OAuth/Session Recovery; Card, Button, Input và InlineAlert tiếp tục dùng A.2. Typography Inter, line-height 150%, màu/spacing/radius/focus của A.1 giữ nguyên.

[auth.css](../../frontend/src/features/auth/components/auth.css) chỉ áp dụng Public & Auth: split 4:5 (640/800 ở 1440), aside Slate từ palette đã đọc, form max-width 480, status card max-width 520/padding 24/radius 12, brand 32. Auth pages mở rộng ngoài cap 1280 bằng selector giới hạn `.app-content:has(> .public-auth)`; layout authenticated A.3 không đổi. Dưới 1024 ẩn aside, gutter 24 và form một cột. Breakpoint này là lựa chọn triển khai từ ảnh tổng hợp, chưa phải native Figma property được đọc.

Ảnh nguồn là `references/02 Public & Auth.png` (4520x4156). Đã so sánh Chrome desktop/mobile với ảnh và xem đủ 17 capture chính qua contact sheet; 45 screenshots kiểm tra mỗi state ở 390/1440px và kích thước frame. Thiếu export/context/asset gốc riêng từng frame vì probe MCP vẫn hết quota: **VISUAL_PARTIAL**, không pixel-perfect. Toggle Show/Hide tái sử dụng A.2; brand/status SVG và preview symbol là fallback được ghi bằng `ponytail:`.

### File đã thay đổi

- Page composition: [login/page.tsx](../../frontend/src/app/login/page.tsx), [register/page.tsx](../../frontend/src/app/register/page.tsx), [verify-email/page.tsx](../../frontend/src/app/verify-email/page.tsx), [oauth callback/page.tsx](../../frontend/src/app/oauth/google/callback/page.tsx).
- Auth presentation: [auth-page.tsx](../../frontend/src/features/auth/components/auth-page.tsx), [auth.css](../../frontend/src/features/auth/components/auth.css), [globals.css](../../frontend/src/app/globals.css), [login-form.tsx](../../frontend/src/features/auth/components/login-form.tsx), [register-form.tsx](../../frontend/src/features/auth/components/register-form.tsx), [google-login-button.tsx](../../frontend/src/features/auth/components/google-login-button.tsx).
- Verification/OAuth: [verify-email-panel.tsx](../../frontend/src/features/auth/components/verify-email-panel.tsx), [email-verification-notice.tsx](../../frontend/src/features/auth/components/email-verification-notice.tsx), [google-oauth-callback.tsx](../../frontend/src/features/auth/components/google-oauth-callback.tsx), [use-verify-email.ts](../../frontend/src/features/auth/hooks/use-verify-email.ts).
- Session/validation/API: [auth-provider.tsx](../../frontend/src/features/auth/components/auth-provider.tsx), [auth-navigation.tsx](../../frontend/src/features/auth/components/auth-navigation.tsx), [session-recovery.tsx](../../frontend/src/features/auth/components/session-recovery.tsx), [use-logout.ts](../../frontend/src/features/auth/hooks/use-logout.ts), [register.schema.ts](../../frontend/src/features/auth/schemas/register.schema.ts), [auth.api.ts](../../frontend/src/features/auth/api/auth.api.ts), [Axios client.ts](../../frontend/src/lib/axios/client.ts).
- Tests: [auth.api.test.ts](../../frontend/src/features/auth/tests/auth.api.test.ts) và [client.test.ts](../../frontend/src/lib/axios/tests/client.test.ts) chuyển từ cạnh source vào `tests/`; thêm [public-auth.test.tsx](../../frontend/src/features/auth/tests/public-auth.test.tsx), [public-auth.browser-check.mjs](../../frontend/src/features/auth/tests/public-auth.browser-check.mjs), cập nhật [primitives.browser-check.mjs](../../frontend/src/components/ui/tests/primitives.browser-check.mjs) để chạy suite auth bằng Chrome/CDP hiện có.
- Tài liệu: [CHECKLIST.md](../../CHECKLIST.md), [README.md](../../README.md), [SCREEN_MAPPING.md](SCREEN_MAPPING.md) và tài liệu này. Thay đổi CHECKLIST về cổng OAuth có sẵn trước task được giữ nguyên. Backend/Prisma/dependencies/lockfiles/AppShell source không đổi.

### Request flow

```text
POST /api/v1/auth/login
→ LoginForm/RHF/Zod → useLogin → auth.api → Axios
→ auth.routes → validateBody → authController.login → authService.login
→ createAuthSession/Prisma → cookie + access token
→ GET /auth/me → authenticate → sessionController.me → sessionService.me/Prisma
→ AuthProvider → getPostLoginPath → AppShell A.3

POST /api/v1/auth/register
→ RegisterForm/RHF/Zod (confirmPassword phải trùng)
→ useRegister → auth.api whitelist email/password/displayName → Axios
→ auth.routes → validateBody → authController.register → authService.register
→ Prisma → 201 user → Success + login CTA

POST /api/v1/auth/email-verification/verify
→ thao tác xác nhận thủ công → useVerifyEmail → auth.api/Axios (public)
→ auth.routes → validateBody → verifyEmailController
→ verifyEmail service/Prisma transaction → response → Success

POST /api/v1/auth/email-verification/request
→ EmailVerificationNotice → useRequestEmailVerification → auth.api/Axios
→ auth.routes → authenticate → requestEmailVerificationController
→ enqueueEmailVerification/pg-boss → 202 accepted hoặc 429
→ worker → requestEmailVerification service → Prisma/token/mail

GET /api/v1/auth/google/start, GET /api/v1/auth/google/callback
→ auth.routes → Google controllers/service → Prisma + Google
→ HttpOnly cookie → /oauth/google/callback
→ AuthProvider: POST /auth/refresh → GET /auth/me
→ GoogleOAuthCallback dùng chung state → router.replace ngay

POST /api/v1/auth/refresh
→ session.routes → sessionController.refresh → sessionService.refresh
→ Prisma → token hoặc credential error
→ Axios/native refresh-failed event → AuthProvider phân loại
→ guest / expired / restore-error hoặc authenticated; không thêm route

POST /api/v1/auth/logout
→ useLogout.beginLogout → auth.api.cancelSessionRefresh → Axios
→ session.routes → sessionController.logout → sessionService.logout
→ Prisma → response → clear user/token/marker/cache → /login
```

Luồng backend trên là source hiện có, chỉ được đọc để trace. Request gửi email hiện gọi enqueue từ controller; không tạo service/repository mới hoặc refactor boundary này trong B.1.

### Quyết định thiết kế

- Business rules/authorization và token verification vẫn ở backend service. Confirm password là validation UI trong schema Zod frontend; feature API có whitelist payload nên không gửi confirmPassword kể cả khi object input chứa field này.
- Verify Email giữ xác nhận thủ công. `202` chỉ báo đã nhận yêu cầu, không khẳng định email đã gửi. `429` hiển thị phản hồi và cho retry thủ công; không có timer 45 giây khi chưa có deadline/Retry-After đáng tin cậy.
- AuthProvider mở rộng state `loading/authenticated/guest/expired/restore-error`, giữ API user/isLoading cũ. Expired cần đúng refresh endpoint + 401 + mã credential xác định + bằng chứng phiên trước; network/5xx và /me lỗi không biến thành guest/expired.
- Response verify public chỉ cập nhật `emailVerifiedAt/updatedAt` khi user hiện tại cùng ID; dùng functional state update trong AuthProvider, không đổi auth status/bằng chứng phiên và không khôi phục user đã logout. Metadata update không xóa `restore-error` hoặc vô hiệu lần retry đang chạy.
- Token chỉ trong memory, refresh cookie HttpOnly do backend quản lý. sessionStorage chỉ lưu cờ boolean theo tab sau /me thành công; cờ không dùng để cấp quyền. Lỗi tạm thời giữ user/token/cache và mounted content; retry có user giữ shell, không biến trang đang mở thành guest.
- Logout đánh dấu chủ động trước request, xóa cờ, abort refresh và vô hiệu kết quả restore cũ; response refresh đến muộn không khôi phục phiên hoặc ghi đè token login mới. Credential bị từ chối xóa user/query cache và render expired; fallback giữ `#main-content` để skip link vẫn hoạt động.
- OAuth Callback dùng cùng kết quả restore với AuthProvider, không gọi refresh/me thêm lần nữa. Success render trước effect điều hướng, không dùng timeout. Chrome giữ destination request chỉ trong test để chụp Success chuyển tiếp.
- Không thêm repository, dependency, store hoặc auth framework. Hai component presentation chung phục vụ nhiều auth screens trong một file; session-recovery là UI cho guard hiện có. Native event chỉ nối Axios infrastructure với AuthProvider.

### Test đã thêm/cập nhật

- `auth/tests/auth.api.test.ts`: whitelist register payload không chứa confirmPassword; logout hủy refresh trước khi gửi request và vẫn clear token khi lỗi.
- `auth/tests/public-auth.test.tsx`: mật khẩu khớp đúng giá trị, bắt buộc confirm; registration success; manual verification/pending/success/invalid/network thiếu JSON; resend không đoán deadline; OAuth states; expired khác restore-error; giữ shell/content và main-content target.
- `lib/axios/tests/client.test.ts`: known credential rejection, network/500/503/429/unknown 401, /me không phải bằng chứng expired, single-flight/retry; refresh cũ sau logout/login và cleanup không làm mất refresh mới.
- Chrome/CDP suite: đủ 17 frame, RHF wiring/API payload, double submit, verify không auto-consume hoặc xóa lỗi restore khi cập nhật metadata, resend 429/202, callback chỉ một restore + redirect ngay, backend OAuth failure redirect cũ, guest/expired, restore + /me errors, interceptor refresh/retry và logout race; giữ tests primitives/shell/guards cũ.
- Không thêm test backend vì không đổi backend/schema/HTTP contract; browser fixtures kiểm tra frontend, không thay thế integration server/Google/SMTP.

### Kiểm tra

Các lệnh thực tế, chạy trong `frontend/` trừ git check ở root:

| Command                                                                           | Kết quả                                                                 |
| --------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `corepack pnpm lint`                                                              | PASS, không warning                                                     |
| `corepack pnpm typecheck`                                                         | PASS                                                                    |
| `corepack pnpm test`                                                              | PASS, 90 tests/10 files; 28 cases mới                                   |
| `corepack pnpm build`                                                             | PASS, 15 static pages                                                   |
| `corepack pnpm start --port 3002`                                                 | Production server chạy để verify Chrome                                 |
| `node src/components/ui/tests/primitives.browser-check.mjs http://127.0.0.1:3002` | PASS, A.2–A.4 và B.1; 17 frame/45 screenshots, không runtime exceptions |
| `git diff --check`                                                                | PASS                                                                    |

Formatter dùng Prettier đã cài trong backend để format các file frontend đã sửa; không cài package mới. Artifact local: `C:/Users/Hoang Viet/AppData/Local/Temp/corebase-phase-a2-3UmauF/`, gồm `b1-frames.json`, `b1-contact-sheet.png` và PNGs. Mỗi lần chạy runner tạo directory mới; metadata ghi node ID/viewport/filename cho từng frame và captures desktop/mobile.

### Vấn đề ngoài scope / PARTIAL / BLOCKED

- **VISUAL_PARTIAL (17 frame):** thiếu context/export/assets gốc riêng từng frame, chưa xác nhận pixel fidelity; giữ native/text/SVG/CSS fallback. Không đánh dấu Product inventory thành DETAIL_OK.
- **PARTIAL (resend countdown):** UI xử lý 429 đầy đủ nhưng không tái tạo con số 45 trong ảnh; chỉ thêm countdown khi API cung cấp thời hạn đáng tin cậy.
- **BLOCKED ngoài B.1:** 58 Product & Handoff frames còn thiếu reference/context; native DS variables/asset details vẫn bị MCP quota chặn.
- Google login thật và SMTP/worker delivery chưa kiểm chứng trong phiên này; API fixtures không chứng minh integration thật. Không sửa backend hoặc HTTP API contract để khắc phục các phần này.

## 16. Phase B.2 - MEMBER

Ngày: 2026-10-09 (Asia/Saigon). **PASS: 17/17 frame chức năng MEM-01 (2), MEM-02 (2), MEM-03 (5), MEM-04 (8). VISUAL_PARTIAL: cả 17 frame. Không có chức năng PARTIAL/BLOCKED.** Mapping từng frame, route/API/permission và bằng chứng nằm ở [SCREEN_MAPPING.md](SCREEN_MAPPING.md), mục 14. Mapping, query routes và current-session logout được người dùng APPROVED trước khi triển khai.

MEM-01/MEM-02 hiện đã hợp nhất trên `/account`; link cũ `?tab=info` canonicalize bằng replace. Số liệu tests/artifacts của B.2 dưới đây là nghiệm thu ban đầu; refactor và verification mới ở mục 19.

### Visual và reuse

Nguồn là [03 MEMBER.png](references/03%20MEMBER.png), 4670x5922. Đã xem đủ 17 crop/reference và Chrome desktop/mobile; 45 captures theo node ID (desktop 1440/mobile 390/canonical) và 8 captures loading/empty/forbidden/list error/menu. [Contact sheet so sánh](../../tmp/phase-b2-acceptance/b2-comparison-contact-sheet.png) giữ cặp reference composite/Chrome. Thiếu original exports/native context/assets, không pixel-perfect; không gọi Figma MCP hoặc nâng inventory thành DETAIL_OK.

[member.css](../../frontend/src/components/member.css) chỉ áp dụng MEMBER composition: padding theo page gutter, heading 32 desktop/24 mobile, card heading 20, grid hai cột Dashboard, table desktop/card list dưới 768px, readonly fields, dropzone/quota và preview. Selector heading có scope đủ để không bị baseline `.app-content h1/h2` ghi đè. Màu `--surface-warning` dùng Amber 50 đã có trong palette A.1; không tạo theme mới.

Tiếp tục dùng bộ 11 primitives A.2, cụ thể Button/Input/Card/RoleBadge/ConfirmDialog/InlineAlert/Skeleton/Progress theo nhu cầu; không tạo primitive trùng. Dùng native details cho permissions, meter cho quota, file input + drop cho upload, popover + CSS anchor positioning cho file actions (fallback fixed khi browser thiếu support). Menu có label/keyboard/Escape; confirm dialog dùng native modal/inert/focus trap/focus restoration hiện có. Progress không suy đoán phần trăm tải lên. File symbol SVG có `ponytail:` vì thiếu asset gốc.

Source AppShell/Sidebar, CSS shell và RootLayout giữ nguyên; chỉ composition navigation và active path đọc query thay đổi. Không thêm breadcrumb/avatar/icon mới vào shell. Reference frame nhỏ có content-only specimen, Chrome giữ shell và dữ liệu nền thật khi mở modal; native modal có backdrop/focus. Wrapping của fixtures, row height và composition empty/error/dropzone còn khác ảnh tổng hợp, nằm trong VISUAL_PARTIAL.

### File đã thay đổi

- Page composition: [account/page.tsx](../../frontend/src/app/account/page.tsx), [account/files/page.tsx](../../frontend/src/app/account/files/page.tsx), [globals.css](../../frontend/src/app/globals.css), thêm [member.css](../../frontend/src/components/member.css).
- Account/navigation: [account-panel.tsx](../../frontend/src/features/auth/components/account-panel.tsx), [auth-navigation.tsx](../../frontend/src/features/auth/components/auth-navigation.tsx), [permissions.ts](../../frontend/src/features/auth/permissions.ts), [post-login-route.ts](../../frontend/src/features/auth/post-login-route.ts).
- Metadata/API/resend: [auth-provider.tsx](../../frontend/src/features/auth/components/auth-provider.tsx), [auth.api.ts](../../frontend/src/features/auth/api/auth.api.ts), [email-verification-notice.tsx](../../frontend/src/features/auth/components/email-verification-notice.tsx), [use-request-email-verification.ts](../../frontend/src/features/auth/hooks/use-request-email-verification.ts).
- Files: [files.api.ts](../../frontend/src/features/files/api/files.api.ts), [markdown-file-manager.tsx](../../frontend/src/features/files/components/markdown-file-manager.tsx).
- Tests: thêm [files.api.test.ts](../../frontend/src/features/files/tests/files.api.test.ts) và [member.browser-check.mjs](../../frontend/src/features/auth/tests/member.browser-check.mjs); sửa [app-shell.test.tsx](../../frontend/src/components/tests/app-shell.test.tsx), [public-auth.browser-check.mjs](../../frontend/src/features/auth/tests/public-auth.browser-check.mjs), [primitives.browser-check.mjs](../../frontend/src/components/ui/tests/primitives.browser-check.mjs); chuyển/cập nhật permissions test từ cạnh source sang [auth/tests/permissions.test.ts](../../frontend/src/features/auth/tests/permissions.test.ts).
- Tài liệu: [CHECKLIST.md](../../CHECKLIST.md), [README.md](../../README.md), [SCREEN_MAPPING.md](SCREEN_MAPPING.md) và tài liệu này. Screenshots/manifests/probe nằm trong `tmp/phase-b2-acceptance/` Git-ignored; không thêm dependency/lockfile hoặc thay backend/Prisma/RBAC/API contracts.

### Request flow

```text
GET /api/v1/auth/me
→ AuthProvider restore / login → auth.api → Axios
→ session.routes → authenticate → sessionController.me
→ sessionService.me → Prisma/access context → response
→ Dashboard / Info / Security (query tab chỉ chọn view)

GET /api/v1/auth/sessions
→ AccountSessions → user-keyed Query + AbortSignal → auth.api/Axios
→ session.routes → authenticate → sessionController.list
→ sessionService.list(userId, JWT sessionId) → Prisma → response

DELETE /api/v1/auth/sessions/:id (phiên khác)
→ confirmation → ref lock → revokeSession/Axios
→ session.routes → authenticate/validateParams → sessionController.revoke
→ sessionService.revoke(userId, id) → Prisma → 204
→ cập nhật/invalidate danh sách; giữ user, token, current session

POST /api/v1/auth/logout (phiên hiện tại)
→ confirmation → useLogout.beginLogout → logoutUser/cancelSessionRefresh
→ session.routes → sessionController.logout → sessionService.logout
→ Prisma → clear HttpOnly cookie + response
→ useLogout.clear user/token/marker/query cache → /login

POST /api/v1/auth/password/change
→ Security RHF/Zod → ref lock → changePassword/Axios
→ auth.routes → authenticate/validateBody → authController.changePassword
→ authService.changePassword → password hash + Prisma → 204
→ RHF reset + success + metadata update; /me lỗi không đổi success thành failure

POST /api/v1/auth/email-verification/request
→ profile notice trên /account → useRequestEmailVerification + ref lock
→ auth.api/Axios → auth.routes → authenticate → requestEmailVerificationController
→ enqueueEmailVerification/pg-boss → 202 accepted hoặc 429
→ UI báo response; không đặt timer hoặc tự xác minh

GET/POST /api/v1/files; GET/PATCH/DELETE /api/v1/files/:id
→ MyFiles query/mutation/preview/download → files.api → Axios
→ file.routes → authenticate/validateParams nếu cần → file.controller
→ fileService (self ownership/quota) → Prisma + file.storage
→ response (POST/PATCH: ID + size; download: octet-stream)
→ user-keyed cache → separate GET list refresh; PATCH preview theo ID mới
```

Luồng backend được trace từ source hiện có, không refactor layer hoặc thêm endpoint. Ownership và session.current tiếp tục do service/backend quyết định. Revoke ngăn refresh của phiên, không vô hiệu ngay JWT stateless đã cấp; UI nói rõ giới hạn này.

### Quyết định thiết kế và authentication state

- Business logic, RBAC/ownership/quota và persistence giữ ở backend services; client chỉ kiểm tra input boundary zero-byte/5 MiB, khóa thao tác và hiển thị contract. Không tạo `files:*`/`sessions:*`. Query tab không phải permission. Không dùng/thêm repository ở frontend hoặc backend.
- AccountPanel giữ các view private trong cùng file; page vẫn mỏng. FileActions phục vụ table và mobile list, dùng Button/native popover; không có generic auth state/store, file adapter/factory hoặc component framework mới. Styles MEMBER dùng tokens/primitives đang có.
- Giữ nguyên AuthProvider states B.1 và Axios interceptor/useLogout. `updatePasswordStatus` chỉ merge hasPassword/updatedAt cho user cùng ID, bỏ update khi logout đang chạy, không đổi status/bằng chứng phiên/restore version. /me follow-up lỗi vẫn giữ password success và thông báo metadata chưa tải được.
- Query keys có user ID, queryFn nhận AbortSignal; content keyed theo user, unmount flag và preview attempt chặn stale response. Logout hiện có clear cache/hủy refresh. Response session/file/list/preview/upload/password/metadata đến muộn không repopulate cache/preview hoặc ghi đè account mới.
- Upload/replace/delete cùng mutation với action discriminant, ref lock chặn cùng tick; confirm current revoke dùng useLogout, other revoke dùng DELETE. Mutation success cập nhật cache từ ID/size đã xác nhận, sau đó invalidate list riêng; GET thất bại không lặp side effect. Pending metadata không bịa timestamp. Quota đầy vẫn cho replace, cùng tên không suy ra overwrite.
- Private text/Markdown preview vẫn dùng escaped pre; binary preview giữ octet-stream, iframe sandbox chặn active content. Object URLs được thu hồi khi đổi/đóng preview/unmount; download có lock và không kích hoạt download muộn sau logout. Không đưa token vào localStorage/sessionStorage; sessionStorage chỉ giữ cờ B.1.
- Trang `/account` hợp nhất chỉ có một resend notice, dùng hook/ref lock hiện có để chặn double submit. 202/429 và manual retry giữ B.1; Verify Email không tự consume token, OAuth không thêm delay. Google-only vẫn đặt mật khẩu từ security tab được.

### Test đã thêm/cập nhật

- `files.api.test.ts`: 9 cases cho empty/size boundary, binary headers, replacement new ID, same-name POST riêng, AbortSignal/list array contract và 404 propagation.
- `auth/tests/permissions.test.ts`: sửa kỳ vọng 5 self-service links, giữ admin grants; chuyển đúng folder test. `app-shell.test.tsx`: thêm 5 query cases (default/info/sessions/security/unknown) để chỉ có một active leaf, không tự thêm permission.
- `member.browser-check.mjs`: 17 frame và 51 assertions cho deep link/Back/Forward/mobile, resend 202/429/same-tick, password reset + /me lỗi + Google-only, current/other revoke, keyboard/focus, file limits/quota/new ID/preview/duplicate name/list retry, 404/403 và stale responses sau logout/account switch. Reuse Chrome/CDP đã có; không thêm framework hoặc package.
- Runner primitives gọi suite Member sau suite A.1–B.1; có `--member-only` để chạy regression liên quan. Fixture files sửa thành mảng đúng contract backend; assertion B.1 về session retry chỉ kiểm tra auth banner, vì list error độc lập còn cần retry riêng. Không sửa B.1 assertion thành việc xóa lỗi/dữ liệu Files.
- Probe 11 tests kiểm tra service/storage backend hiện có (DB mock, local storage thật). File chạy tạm trong `backend/tmp/`, sau đó bỏ khỏi backend và lưu bản probe ở artifact local; backend tracked files không đổi. Cover missing/other-owner GET/PATCH/DELETE đều 404, quota/full replace, same-name new records, empty/exact/oversized, current flag, other revoke và refresh bị từ chối sau revoke.

Không thêm unit test lặp lại từng JSX/style/helper hoặc framework dialog/RHF/TanStack. Behavior tương tác được kiểm tra bằng production Chrome; backend giữ tests hiện có, không đổi source để phục vụ test.

### Kiểm tra

| Command / phạm vi                                                                              | Kết quả                                                                                       |
| ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `corepack pnpm typecheck` tại frontend                                                         | PASS                                                                                          |
| `corepack pnpm lint` tại frontend                                                              | PASS, 0 error / 0 warning                                                                     |
| `corepack pnpm test -- src/features/auth/tests src/features/files/tests src/components/tests`  | PASS, kiểm tra liên quan trước suite toàn bộ                                                  |
| `corepack pnpm test` tại frontend                                                              | PASS, 104 tests / 11 files, tăng 14 so với B.1                                                |
| `corepack pnpm build` tại frontend                                                             | PASS, production Turbopack, 15 static pages                                                   |
| `corepack pnpm test` tại backend                                                               | PASS, 25 tests / 9 files hiện có                                                              |
| `corepack pnpm exec vitest run tmp/b2-contract.verify.test.ts` tại backend                     | PASS, 11 tests / 1 probe tạm                                                                  |
| `node src/components/ui/tests/primitives.browser-check.mjs http://127.0.0.1:3002` tại frontend | PASS A.1–B.2, production Chrome, không runtime exception; B.1 17 frame và B.2 17 frame        |
| Runner cùng command thêm `--member-only`                                                       | PASS, 17 B.2 frames / 51 assertions; dùng để tạo artifact sau chuẩn hóa screenshot modal/menu |
| `git diff --check` tại root                                                                    | PASS                                                                                          |

Artifact B.2 local: [manifest 17 frames](../../tmp/phase-b2-acceptance/b2-frames.json), [51 assertions + 8 captures bổ sung](../../tmp/phase-b2-acceptance/b2-regressions.json), [Chrome sheet](../../tmp/phase-b2-acceptance/b2-chrome-contact-sheet.png), [comparison sheet](../../tmp/phase-b2-acceptance/b2-comparison-contact-sheet.png). 45 frame captures + 8 state/menu captures = **53 screenshots B.2**. Modal và captures bổ sung dùng viewport để fixed header/top layer không xuất hiện lệch vị trí trong ảnh full-page; pages dùng full-page. Lượt Chrome regression toàn bộ PASS nằm tại `C:/Users/Hoang Viet/AppData/Local/Temp/corebase-phase-a2-rmPAnj/`; B.1 manifest giữ 45 captures ở cùng lượt. Browser APIs là fixtures, không lấy dữ liệu/credential người dùng thật.

### Vấn đề ngoài scope / PARTIAL / BLOCKED

- **VISUAL_PARTIAL:** ảnh tổng hợp đủ để triển khai các state; thiếu export/native properties/assets gốc để đối chiếu đầy đủ, không tuyên bố pixel-perfect. Giữ visual fallbacks A.3 theo APPROVED; dùng SVG/native CSS tối thiểu trong MEMBER.
- **Technical debt:** quota count-before-save ở backend không atomic với các upload đồng thời. B.2 khóa double submit trong một view, không đảm bảo quota với nhiều tab/client; không tự sửa transaction/database.
- **Giới hạn verification:** DB mock không chứng minh PostgreSQL transaction/concurrency live; local storage thật đã chạy nhưng không chạy R2 thật. Google OAuth và worker/SMTP delivery thật chưa chạy trong phiên này; giữ flow và kiểm tra frontend qua fixtures.
- **Ngoài B.2:** 41 Product & Handoff frames còn chờ reference/mapping; native context/variables/icons vẫn bị MCP quota chặn. Không có blocker chức năng cho 17 frame MEMBER.

## 17. Phase B.3 - ADMIN

Ngày: 2026-10-09 (Asia/Saigon). **14/14 FUNCTIONAL_DONE: ADM-01 (2), ADM-02 (6), ADM-03 (6). 14/14 VISUAL_PARTIAL. Không có chức năng PARTIAL/BLOCKED.** Người dùng APPROVED mapping trước triển khai; nghiệm thu từng node/route/API/permission tại [SCREEN_MAPPING.md](SCREEN_MAPPING.md), mục 15.

### Visual và reuse

Nguồn [04 ADMIN.png](references/04%20ADMIN.png), 4670x4969; không gọi MCP. Dùng semantic tokens A.1 và 11 primitives A.2 hiện có, cụ thể Button/Input/Card/RoleBadge/InlineAlert/Skeleton theo nhu cầu. [admin.css](../../frontend/src/components/admin.css) scope ADMIN: heading 32 desktop/24 mobile, page gutter/padding 32 desktop/24 mobile, Dashboard hai cột/một cột, Users/Audit table desktop và cards dưới 768px, filters, readonly fields, status text và long-text wrapping.

AppShell/Sidebar, shell CSS, AuthProvider/interceptor/useLogout và RootLayout giữ nguyên. Dashboard dùng getNavigationItems để chọn đúng bốn capability cards; Users/Audit links theo permission hiện có. Không tạo KPI, charts, system config hoặc backend capability từ permission catalog.

[DetailsDrawer](../../frontend/src/components/ui/details-drawer.tsx) là một component native dialog cho hai consumer Users/Audit thật; không tạo dialog framework hoặc duplicate confirmation primitive. Reuse showModal/inert/Tab/Escape/focus pattern A.2/A.3; initial focus Close, return trigger khi còn visible, fallback heading nếu trigger mất sau refetch. Geometry width cap 560/full-height/right edge và backdrop là quyết định presentation, không phải native Figma properties đã đọc. Metadata pre wrap, escaped strings, UUID/null giữ đúng API.

42 screenshots gồm 36 captures của 14 frame ở 1440/390/720 và 6 loading/error/empty/forbidden bổ sung; kiểm tra thêm 320/768/1280/1600. Đã xem contact sheet reference/Chrome cùng ảnh chi tiết desktop/mobile/720; heading mobile được chỉnh theo token A.1 sau đối chiếu. Text card markers có ponytail cho icons chưa có bản gốc. Neutral role badges và shell brand/avatar fallbacks A.3 tiếp tục VISUAL_PARTIAL.

### File đã thay đổi

- Page composition: [admin/page.tsx](../../frontend/src/app/admin/page.tsx), [admin/users/page.tsx](../../frontend/src/app/admin/users/page.tsx), [admin/audit-logs/page.tsx](../../frontend/src/app/admin/audit-logs/page.tsx); [globals.css](../../frontend/src/app/globals.css) import [admin.css](../../frontend/src/components/admin.css).
- Dashboard/UI gate: [role-dashboard.tsx](../../frontend/src/features/auth/components/role-dashboard.tsx), [permissions.ts](../../frontend/src/features/auth/permissions.ts) chỉ thêm tên hằng roles:manage đã tồn tại; bảo toàn SUPER_ADMIN guard/children.
- Users: [admin-users.tsx](../../frontend/src/features/users/components/admin-users.tsx), [use-users.ts](../../frontend/src/features/users/hooks/use-users.ts), [users.api.ts](../../frontend/src/features/users/api/users.api.ts).
- Audit: [admin-audit-logs.tsx](../../frontend/src/features/audit/components/admin-audit-logs.tsx), [use-audit-logs.ts](../../frontend/src/features/audit/hooks/use-audit-logs.ts), [audit.api.ts](../../frontend/src/features/audit/api/audit.api.ts).
- Shared details/query: thêm [details-drawer.tsx](../../frontend/src/components/ui/details-drawer.tsx); [query-keys.ts](../../frontend/src/lib/query/query-keys.ts) và [query-keys.test.ts](../../frontend/src/lib/query/query-keys.test.ts) phân tách account/applied filters.
- Tests: thêm [admin-users.test.tsx](../../frontend/src/features/users/tests/admin-users.test.tsx), [users.api.test.ts](../../frontend/src/features/users/tests/users.api.test.ts), [audit.api.test.ts](../../frontend/src/features/audit/tests/audit.api.test.ts), [admin.browser-check.mjs](../../frontend/src/features/users/tests/admin.browser-check.mjs), [admin.contract.test.ts](../../backend/tests/integration/admin.contract.test.ts); cập nhật [primitives.browser-check.mjs](../../frontend/src/components/ui/tests/primitives.browser-check.mjs).
- Tài liệu: [CHECKLIST.md](../../CHECKLIST.md), [README.md](../../README.md), [SCREEN_MAPPING.md](SCREEN_MAPPING.md), tài liệu này. Artifact `tmp/phase-b3-acceptance/` Git-ignored. Không thêm dependency/lockfile hoặc sửa backend runtime/Prisma/database/API contracts.

Các thay đổi B.2 có sẵn trong working tree được giữ nguyên; danh sách trên là phạm vi B.3.

### Request flow

```text
GET /api/v1/auth/me
→ AuthProvider restore/login → auth.api/Axios
→ authRouter/sessionRouter → authenticate → sessionController.me
→ sessionService.me → Prisma + accessService/accessRepository
→ user/access response → RoleDashboard guard → ADMIN cards

GET /api/v1/users
→ AdminUsers permission gate → UsersContent keyed account
→ useUsers/query key + AbortSignal → users.api/Axios
→ user.routes → authenticate → authorize(users:read)
→ listUsersController → userService.listUsers → Prisma
→ users response → local search/filter/sort + readonly selected record

PATCH /api/v1/users/:userId/roles/admin { enabled }
→ SUPER_ADMIN AND roles:manage UI controls → ref lock → setAdminRole/Axios
→ user.routes → authenticate → authorize(roles:manage)
→ assertUserIsSuperAdmin → validateParams/validateBody
→ setAdminRoleController → userService.setAdminRole → Prisma
→ response → guarded feedback + invalidate exact account list

GET /api/v1/audit-logs?limit&action&actorUserId&cursor
→ AdminAuditLogs permission gate → AuditContent/RHF/Zod Apply
→ useAuditLogs(account, applied filters) + AbortSignal → audit.api/Axios
→ audit.routes → authenticate → authorize(audit:read) → validateQuery
→ listAuditLogsController → listAuditLogs
→ auditRepository.findAuditLogs → Prisma (createdAt desc, id desc)
→ auditLogs + nextCursor → table/cards, readonly details, load more/retry
```

Routes/controllers/services/backend repository ở trên là source hiện có, không sửa. Backend tiếp tục kiểm tra quyền thực từ database; việc không mount nút không thay backend authorization.

### Quyết định thiết kế và authentication state

- Business rules/permission enforcement/persistence vẫn ở backend. Users chỉ có list + role mutation SUPER_ADMIN đang có; không suy ra sửa/khóa user từ users:update/users:suspend hoặc thêm detail/search/pagination endpoint.
- Users search trim/case-insensitive trên tên/email, role xét mọi roles[], status kết hợp, sort trên array mới. UserRoles/UserStatus là private presentation dùng chung cho table/cards/details; không tạo users repository/adapter/helper layer.
- Audit chỉ hỗ trợ action catalog/actor UUID/limit 1–100/default 50 và nextCursor. Frontend API gửi whitelist params; test đối chiếu action options với backend catalog. RHF/Zod tách draft và applied filters. Không decode cursor, thêm date/outcome/name filters hoặc dựng số trang/total.
- Query keys chứa account và applied filters; API nhận AbortSignal. Unmount/mất quyền/đổi filter hủy và remove exact scoped key; quay lại filter set cũ vẫn lấy trang đầu. Tạm xác minh phiên chỉ cancel/ẩn protected content, giữ cache cùng account và auth state. Không dùng previous-account placeholder data.
- Initial/refetch error có retry riêng, 403 ẩn cached rows/drawer. Next-page 503 giữ các pages và retry cursor trước đó; synchronous ref lock + isFetching chặn load-more lặp. Role mutation cũng có ref lock, lifecycle guard, success/error và invalidate đúng account. Không clear cache toàn cục ngoài logout/expired đã có.
- AuthProvider states loading/authenticated/guest/expired/restore-error, refresh single-flight và HttpOnly cookie giữ nguyên. Network/5xx không xóa phiên, refresh thành công retry bình thường, logout không expired. Token chỉ memory; Web Storage chỉ có boolean marker B.1.
- DetailsDrawer phục vụ hai module, dùng platform native; không sửa ConfirmDialog/Shell hoặc tạo state framework. Clipboard lỗi có hướng dẫn chọn ID thủ công. Dữ liệu không được render thành HTML hay thay bằng fixtures Figma.

### Test đã thêm/cập nhật

- `admin-users.test.tsx`: 16 cases cho ADMIN không mount role actions dù có roles:manage, SUPER_ADMIN AND permission, guest/permission/query mount, hiding cached data khi verify hoặc 403, transient errors giữ data/retry, empty dataset, Dashboard card gates và SUPER_ADMIN child guard.
- `users.api.test.ts`: 3 cases cho list response/AbortSignal/no server query params và enabled true/false payload. `audit.api.test.ts`: 3 cases cho catalog parity, whitelist filters/cursor/AbortSignal và initial request không cursor.
- `query-keys.test.ts`: 2 cases bảo vệ account/filter/page-size isolation, thay kỳ vọng keys cũ không có identity. Tổng frontend tăng 23 từ baseline 104 lên 127.
- `admin.contract.test.ts`: 16 tests với routes/guards/schema/controller/service thật; auth/JWT boundary và Prisma mock. Cover 401/403, flattened roles/response shape, audit supported filters + cursor/order/default limit + empty page + invalid input và mutation gate cần cả SUPER_ADMIN/roles:manage. Không mock từng controller/service hoặc đổi runtime để phục vụ test.
- `admin.browser-check.mjs`: 104 assertions, 14 frames/42 captures, ADMIN/SUPER_ADMIN/MEMBER, 401/403, Users filters/sort/empty/retry, Audit valid/invalid inputs, cursor/next error/retry/filter races, metadata XSS-as-text/copy ID, native dialog keyboard/AX/focus/fallback, late queries/mutations, permission revocation, logout và account switch không logout.
- Runner dùng lại Chrome/CDP hiện có; thêm `--admin-only` để debug riêng. Click driver đợi hai animation frames sau scroll để native popover anchor ổn định; regression Files từng timeout do click đo sớm, suite cuối PASS mà không sửa runtime MEMBER.

Không thêm test lặp từng JSX/style/private helper hoặc framework. Tests tương tác cần DOM chạy trong Chrome production; không coi SSR assertions là bằng chứng keyboard/focus. Không chạy migration/seed hoặc gọi dữ liệu người dùng thật.

### Kiểm tra

| Command / phạm vi                                                                                                       | Kết quả                                                                                       |
| ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `corepack pnpm typecheck` tại frontend                                                                                  | PASS                                                                                          |
| `corepack pnpm lint` tại frontend                                                                                       | PASS, 0 error / 0 warning                                                                     |
| `corepack pnpm test -- src/features/users/tests src/features/audit/tests src/lib/query/query-keys.test.ts` tại frontend | PASS, checks liên quan trước suite toàn bộ                                                    |
| `corepack pnpm test` tại frontend                                                                                       | PASS, 127 tests / 14 files                                                                    |
| `corepack pnpm build` tại frontend                                                                                      | PASS, production Turbopack, 15 static pages                                                   |
| `corepack pnpm lint`, `typecheck`, `build`, `format:check` tại backend                                                  | PASS                                                                                          |
| `corepack pnpm test -- tests/integration/admin.contract.test.ts` tại backend                                            | PASS, 16 contract tests                                                                       |
| `corepack pnpm test` tại backend                                                                                        | PASS, 41 tests / 10 files                                                                     |
| `node src/components/ui/tests/primitives.browser-check.mjs http://127.0.0.1:3002` tại frontend                          | PASS A.1–B.3, 0 runtime exception; B.1 17 frames, B.2 17/51 assertions, B.3 14/104 assertions |
| Runner cùng command thêm `--admin-only`                                                                                 | PASS trước lượt toàn bộ; dùng API fixtures                                                    |
| `git diff --check` tại root                                                                                             | PASS                                                                                          |

Artifacts local: [manifest](../../tmp/phase-b3-acceptance/b3-frames.json), [regressions](../../tmp/phase-b3-acceptance/b3-regressions.json), [verification](../../tmp/phase-b3-acceptance/verification.json), [Chrome sheet](../../tmp/phase-b3-acceptance/b3-chrome-contact-sheet.png), [reference/Chrome sheet](../../tmp/phase-b3-acceptance/b3-comparison-contact-sheet.png). Runner production dùng `corepack pnpm start --port 3002`; full passing profile `C:/Users/HOANGV~1/AppData/Local/Temp/corebase-phase-a2-ZyKx4c/`. Captures gốc được giữ cùng manifest; sheets chỉ giúp so bố cục/state.

### Vấn đề ngoài scope / PARTIAL / BLOCKED

- **VISUAL_PARTIAL:** chỉ có composite, thiếu original per-frame exports/native properties/assets. Shell/icon/neutral badges, drawer width/backdrop, table rows/fixture sorting/locale dates và wrapping còn khác reference; không pixel-perfect. Các frame 720 là content specimens, page thật giữ shell/filters nên chiều cao khác; mobile list thật không bị giới hạn theo số record mẫu trong ảnh.
- **Verification limits:** Chrome HTTP fixtures cố tình dùng pages nhỏ để exercise UI; backend tests mock JWT/auth và DB, không xác nhận live PostgreSQL/RBAC/cursor persistence. Google/SMTP/worker/R2 thật chưa chạy; các frontend flows cũ được regression qua fixtures.
- **Existing technical debt:** GET users trả toàn bộ danh sách, không có server pagination; B.3 không thêm endpoint/virtualization. Quota upload đồng thời count-before-save B.2 vẫn không atomic, không sửa backend.
- **BLOCKED ngoài B.3:** 27 Product & Handoff frames chưa có mapping/reference được xác nhận; native context/variables/assets còn quota chặn. Không có blocker chức năng của 14 frame ADMIN.

## 18. Phase B.4 - SUPER_ADMIN

Ngày: 2026-10-09 (Asia/Saigon). Mapping và triển khai được người dùng **APPROVED**. **14/14 FUNCTIONAL_DONE: SUP-01 (2), SUP-02 (5), SUP-03 (6), SUP-04 (1). 14/14 VISUAL_PARTIAL. Không có frame chức năng PARTIAL/BLOCKED.** Nghiệm thu từng node/route/API/permission ở [SCREEN_MAPPING.md](SCREEN_MAPPING.md), mục 16.

### Visual và reuse

Nguồn [05 SUPER_ADMIN.png](references/05%20SUPER_ADMIN.png), 4670x4944; không gọi MCP. AppShell, layout/semantic tokens/typography A.1 và primitives A.2 tiếp tục được tái sử dụng. Dashboard dùng Card/Button, hai cột desktop/một cột mobile, năm cards Users/Audit/Email/Account/Files. Link visibility lấy từ navigation hiện có; trạng thái email lấy từ GET, có loading/error/retry. Không thêm KPI hoặc API.

Email view dùng controlled Switch với accessible label, native ConfirmDialog, Card/InlineAlert/Skeleton/Progress. Switch không optimistic; giữ boolean cuối đã xác minh và disable khi saving/reconciling/unknown/read-error. Mobile đặt switch dưới phần trạng thái. On/Off không hardcode theo Figma. ConfirmDialog thêm optional heading fallback; giữ Escape/cancel/Tab pattern đã có. Cancel đóng presentation, không hủy thao tác server đã xử lý. DetailsDrawer B.3 được giữ nguyên trong Users; không có dialog hoặc drawer duplicate.

RBAC dùng native table/caption/row-column headers trong region có accessible name, keyboard focus và horizontal scroll ở mobile. Đây là default catalog source, không phải quyền runtime DB; production không import backend runtime hoặc fetch endpoint mới. Literal snapshot bảy permission chỉ dành cho reference, có `ponytail:` và test đối chiếu với backend catalog. Không dùng matrix để quyết định authorization.

Đã xem sheet so sánh đủ 14 frame và screenshots chi tiết desktop/mobile/720. Có 36 frame captures + 8 captures bổ sung = **44 screenshots B.4**. Các crops trong comparison lấy từ composite người dùng cung cấp, không phải original Figma exports. Specimens 720 khác runtime có AppShell/backdrop/list nền; giữ text icon/brand/avatar/badge fallbacks A.3. Geometry, wrapping, icon, fixture data và current verified state tiếp tục VISUAL_PARTIAL; không pixel-perfect.

### File đã thay đổi

- SUPER_ADMIN composition: [super-admin/page.tsx](../../frontend/src/app/super-admin/page.tsx), [role-dashboard.tsx](../../frontend/src/features/auth/components/role-dashboard.tsx), thêm [super-admin-workspace.tsx](../../frontend/src/features/system/components/super-admin-workspace.tsx). RoleDashboard SUPER_ADMIN giữ guard và render children; ADMIN composition giữ B.3.
- System feature: [email-verification-setting.tsx](../../frontend/src/features/system/components/email-verification-setting.tsx), [system.api.ts](../../frontend/src/features/system/api/system.api.ts), thêm [use-email-verification-setting.ts](../../frontend/src/features/system/hooks/use-email-verification-setting.ts) cho Dashboard và setting; [query-keys.ts](../../frontend/src/lib/query/query-keys.ts) thêm account key.
- Users/UI: [admin-users.tsx](../../frontend/src/features/users/components/admin-users.tsx), [users.api.ts](../../frontend/src/features/users/api/users.api.ts), [confirm-dialog.tsx](../../frontend/src/components/ui/confirm-dialog.tsx), [admin.css](../../frontend/src/components/admin.css) chỉ thêm system setting/matrix styles.
- Navigation và request isolation: [permissions.ts](../../frontend/src/features/auth/permissions.ts) chỉ thêm SA navigation links, không đổi PERMISSIONS/ROLES; [auth-navigation.tsx](../../frontend/src/features/auth/components/auth-navigation.tsx), [access-token.ts](../../frontend/src/lib/auth/access-token.ts), [client.ts](../../frontend/src/lib/axios/client.ts), [auth.api.ts](../../frontend/src/features/auth/api/auth.api.ts), [auth-provider.tsx](../../frontend/src/features/auth/components/auth-provider.tsx).
- Frontend tests: thêm [super-admin.test.tsx](../../frontend/src/features/system/tests/super-admin.test.tsx), [super-admin.browser-check.mjs](../../frontend/src/features/system/tests/super-admin.browser-check.mjs); cập nhật [client.test.ts](../../frontend/src/lib/axios/tests/client.test.ts), [page.test.tsx](../../frontend/src/app/super-admin/tests/page.test.tsx), [app-shell.test.tsx](../../frontend/src/components/tests/app-shell.test.tsx), [permissions.test.ts](../../frontend/src/features/auth/tests/permissions.test.ts), [query-keys.test.ts](../../frontend/src/lib/query/query-keys.test.ts), [users.api.test.ts](../../frontend/src/features/users/tests/users.api.test.ts), [admin.browser-check.mjs](../../frontend/src/features/users/tests/admin.browser-check.mjs), [primitives.browser-check.mjs](../../frontend/src/components/ui/tests/primitives.browser-check.mjs).
- Backend tests only: thêm [system.contract.test.ts](../../backend/tests/integration/system.contract.test.ts), cập nhật [admin.contract.test.ts](../../backend/tests/integration/admin.contract.test.ts) thêm grant/revoke response shape và missing target.
- Tài liệu: [CHECKLIST.md](../../CHECKLIST.md), [README.md](../../README.md), [SCREEN_MAPPING.md](SCREEN_MAPPING.md), tài liệu này. Artifact `tmp/phase-b4-acceptance/` Git-ignored. Không đổi backend runtime/Prisma/schema/API/catalog/dependency/lockfile. Các thay đổi B.2/B.3 có sẵn được bảo toàn.

### Request flow

```text
GET /api/v1/auth/me
→ AuthProvider restore/login → auth.api/Axios
→ auth/session routes → authenticate → sessionController.me
→ sessionService.me → Prisma + accessService/accessRepository
→ verified user/access → RoleDashboard SUPER_ADMIN → Workspace tab

GET /api/v1/users
→ AdminUsers users:read gate → useUsers(account ID, AbortSignal)
→ users.api/Axios → user.routes → authenticate → authorize(users:read)
→ listUsersController → userService.listUsers → Prisma
→ real list → search/filter/sort/DetailsDrawer/role target

PATCH /api/v1/users/:userId/roles/admin { enabled }
→ SUPER_ADMIN AND roles:manage → ConfirmDialog → ref lock + AbortSignal
→ users.api/Axios (request version + guarded 401 refresh/replay)
→ user.routes → authenticate → authorize(roles:manage)
→ assertUserIsSuperAdmin → validateParams/validateBody
→ setAdminRoleController → userService.setAdminRole → Prisma
→ { enabled } → mutation success → exact account GET /users
→ GET success: updated record; GET failure: separate list retry, no PATCH replay

GET /api/v1/system/email-verification
→ verified SUPER_ADMIN → useEmailVerificationSetting(account ID, AbortSignal)
→ system.api/Axios → system.routes → authenticate → assertUserIsSuperAdmin
→ existing inline HTTP handler → systemService.isEmailVerificationEnabled
→ Prisma singleton → { enabled } → verified Switch/Dashboard value

PATCH /api/v1/system/email-verification { enabled }
→ Switch intent → ConfirmDialog → ref lock + AbortSignal → system.api/Axios
→ system.routes → authenticate → assertUserIsSuperAdmin → existing boolean schema
→ existing inline HTTP handler → systemService.setEmailVerificationEnabled
→ Prisma singleton upsert → { enabled } → exact account verified cache
→ timeout/network/5xx: GET reconcile → success/error/unknown; no automatic PATCH retry

/super-admin?tab=rbac
→ existing auth/role guard → local verified default-catalog reference → readonly table
→ no API, editor or permission mutation
```

System routes hiện đã dùng inline handler/schema; B.4 không tạo controller hoặc refactor backend. Authorization tiếp tục do DB role/permission checks thực thi; ẩn nút không bảo vệ thay backend.

### Quyết định thiết kế và authentication state

- Business rules và persistence vẫn ở backend. Frontend chỉ làm presentation, confirmation, trạng thái request và lifecycle isolation. Không tạo repository/service/framework mới; hook system có hai consumer thật, dùng query keys/account/cancellation hiện có.
- Giữ bốn pathname/query views đã chốt. Tab chỉ chọn view, không tạo backend route, permission hoặc capability. SUPER_ADMIN email setting cần role, không thêm roles:manage gate cho system API. Role action cần SUPER_ADMIN và roles:manage; Users list vẫn users:read.
- Role success và list refetch success độc lập. Response `{ enabled }` không đủ để dựng user mới; lấy updated record từ GET. Mutation ref lock chặn same-tick submit, retry false; GET failure không gửi lại PATCH. Revoke không ảnh hưởng đến roles khác vì backend contract giữ nguyên.
- Email write dùng boolean server trả về. Definite rejection có mutation-error; timeout/network/5xx đưa vào unknown và GET reconcile. Trong lúc chưa đọc lại được, giá trị cũ chỉ để tham khảo và ghi bị khóa. Recheck chỉ GET; GET đúng target cho success, khác target mở retry qua confirmation mới. Không gọi trạng thái lỗi là rollback hoặc thay verification status của người dùng cũ.
- AuthProvider giữ năm states cũ; vẫn phân biệt guest/expired/restore-error, transient failure không clear token và intentional logout không tạo expired. Thêm request invalidation trên login/logout/explicit restoration; integer version cùng native event `auth:requests-invalidated` hủy stale pending UI. Không thêm token storage hoặc auth state model.
- Interceptor stamp/check version trước refresh, sau refresh và trước replay. Same-session refresh không tăng version nên concurrent requests vẫn dùng một rotation. Refresh cũ không overwrite/clear token mới và không phá single-flight của restoration mới. Request/mutation A không replay với token B; signal abort và version/lifecycle checks chặn late feedback/refetch/cache writes.
- Pending verification ẩn old setting/list; account switch unmount keyed content và remove exact account cache. Mất quyền/403 đóng modal, ẩn mutation controls/protected setting; list chỉ giữ khi users:read còn hiệu lực. AbortSignal không thu hồi write đã được server xử lý, GET chỉ xác minh giá trị ở thời điểm đọc.

### Test đã thêm/cập nhật

- `super-admin.test.tsx`: 14 cases về role/query mount gates, On/Off/current setting, loading/restore-error/read error/403/cache read-only, route fallback/link permissions, actual GET/PATCH boolean + AbortSignal và static catalog khớp backend. SSR tests không kiểm tra effects/focus; phần đó do Chrome.
- `client.test.ts`: thêm 9 regression cases delayed 401 sau logout/login/restore, replay config cũ, mutation bị logout/login/abort khi refresh pending, same-session concurrent retry và restoration mới không bị old refresh phá. Các classification/network/5xx tests cũ tiếp tục PASS.
- `app-shell.test.tsx`: bốn query active-state cases; navigation/route-guard/query-key/API tests cập nhật theo Workspace và optional signal, không nới permission assertions.
- `system.contract.test.ts`: 12 cases với system routes/role gate/service thật, auth/Prisma mocks. Cover unauthenticated/forbidden, SUPER_ADMIN không cần roles:manage, default false, boolean On/Off response/write và invalid body không ghi DB. Invalid body hiện trả generic 500 do inline ZodError; test ghi đúng contract hiện có.
- `admin.contract.test.ts`: thêm ba cases grant/revoke chỉ trả enabled và missing user → 404 không mutation, giữ 16 B.3 cases. Backend runtime không chỉnh để phục vụ tests.
- `super-admin.browser-check.mjs`: 104 assertions, đủ 14 frames/44 captures; native keyboard/name/focus/fallback, pending/double-submit, role 200/403/500 + refetch failure, email loading/read-error/403/mutation-error/timeout/5xx/network/reconcile/retry, Back/Forward, ADMIN/MEMBER denial, account switch/logout khi PATCH hoặc 401 refresh pending và permission revocation.
- Runner A.1–B.3 cập nhật để confirm trước role actions, đợi provider commit và chấp nhận CDP request đã bị cancellation. Không đổi runtime MEMBER/Audit để làm tests pass. Không thêm test framework/dependency; các checks dùng convention tests hiện có.

### Kiểm tra

| Command / phạm vi                                                                                                      | Kết quả                                                                                                       |
| ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `corepack pnpm lint` tại frontend                                                                                      | PASS, 0 error / 0 warning                                                                                     |
| `corepack pnpm typecheck` tại frontend                                                                                 | PASS                                                                                                          |
| `corepack pnpm test` tại frontend                                                                                      | PASS, 154 tests / 15 files (+27 từ B.3)                                                                       |
| `corepack pnpm build` tại frontend                                                                                     | PASS, Turbopack production, 15 static pages                                                                   |
| `corepack pnpm lint`, `typecheck`, `build`, `format:check` tại backend                                                 | PASS                                                                                                          |
| `corepack pnpm test -- tests/integration/system.contract.test.ts tests/integration/admin.contract.test.ts` tại backend | PASS, 31 contract tests                                                                                       |
| `corepack pnpm test` tại backend                                                                                       | PASS, 56 tests / 11 files (+15 từ B.3)                                                                        |
| `node src/components/ui/tests/primitives.browser-check.mjs http://127.0.0.1:3002 --super-admin-only` tại frontend      | PASS, 14 B.4 frames / 104 assertions                                                                          |
| Runner cùng command thêm `--admin-only`                                                                                | PASS, 14 B.3 frames / 104 assertions                                                                          |
| Runner không thêm options tại frontend                                                                                 | PASS A.1–B.4, 0 runtime exception; B.1 17, B.2 17/51 assertions, B.3 14/104 assertions, B.4 14/104 assertions |
| `git diff --check` tại root                                                                                            | PASS                                                                                                          |

Artifacts: [manifest](../../tmp/phase-b4-acceptance/b4-frames.json), [regressions](../../tmp/phase-b4-acceptance/b4-regressions.json), [verification](../../tmp/phase-b4-acceptance/verification.json), [Chrome sheet](../../tmp/phase-b4-acceptance/b4-chrome-contact-sheet.png), [reference/Chrome sheet](../../tmp/phase-b4-acceptance/b4-comparison-contact-sheet.png). Production runner dùng `corepack pnpm start --port 3002`; full passing profile `C:/Users/HOANGV~1/AppData/Local/Temp/corebase-phase-a2-WNSKL3/`. Local artifacts không chứa dữ liệu/credentials người dùng thật.

### Vấn đề ngoài scope / PARTIAL / BLOCKED

- **VISUAL_PARTIAL:** thiếu original frame exports/native properties/icons; composite đủ đối chiếu bố cục/state nhưng không chứng minh pixel-perfect. Current data và error/reconcile copy đúng flow thực, không copy dữ liệu mẫu hoặc rollback assumption từ Figma.
- **Verification limits:** HTTP fixtures và auth/DB mocks không xác nhận live JWT/RBAC/PostgreSQL/SMTP/OAuth/worker/R2. Cần integration với môi trường thật để xác nhận delivery/persistence/concurrency.
- **Technical debt hiện có:** invalid system setting body trả 500 thay vì validation 4xx do inline ZodError (không ghi DB); setting không có version/ETag cho concurrent updates; GET users trả toàn bộ dataset; quota upload đồng thời B.2 chưa atomic. Không sửa backend trong B.4.
- **BLOCKED ngoài B.4:** 13 Product & Handoff frames chưa triển khai; native context/variables/assets vẫn quota chặn. Không có chức năng B.4 BLOCKED.

## 19. Hợp nhất Account Dashboard/Info

Ngày: 2026-10-09. **FUNCTIONAL_DONE; VISUAL_PARTIAL.** MEM-01 (`4:40847`, `4:40924`) và MEM-02 (`4:40985`, `4:40999`) cùng dùng AccountPanel tại `/account`. Không còn view Info riêng; `/account?tab=info` là alias tương thích được `router.replace` về `/account`, không thêm history entry. Phần tab account và session table được cập nhật tiếp ở mục 20.

File thay đổi trong refactor này:

- UI/routing: [account-panel.tsx](../../frontend/src/features/auth/components/account-panel.tsx), [permissions.ts](../../frontend/src/features/auth/permissions.ts), [post-login-route.ts](../../frontend/src/features/auth/post-login-route.ts).
- Tests: thêm [account-panel.test.tsx](../../frontend/src/features/auth/tests/account-panel.test.tsx); cập nhật [permissions.test.ts](../../frontend/src/features/auth/tests/permissions.test.ts), [app-shell.test.tsx](../../frontend/src/components/tests/app-shell.test.tsx), [member.browser-check.mjs](../../frontend/src/features/auth/tests/member.browser-check.mjs), [primitives.browser-check.mjs](../../frontend/src/components/ui/tests/primitives.browser-check.mjs).
- Tài liệu: [CHECKLIST.md](../../CHECKLIST.md), [README.md](../../README.md), [SCREEN_MAPPING.md](SCREEN_MAPPING.md), tài liệu này; screenshots/manifests local ở `tmp/account-merge-acceptance/`.

Composition dùng nguyên Card, RoleBadge, Button styling, InlineAlert, native details, `member.css` và AppShell: profile/quick links ở tab thông tin; roles/permissions ở tab vai trò; password ở tab bảo mật; session list ở tab phiên. Chỉ một EmailVerificationNotice cho user chưa xác minh. Không thêm API, primitive, abstraction hoặc dependency.

Data flow giữ `GET /api/v1/auth/me → session.routes → authenticate → sessionController.me → sessionService.me/Prisma → AuthProvider → AccountPanel → AccountInfo`. Việc gộp/canonicalize không gọi lại `/me`; tab thông tin không prefetch Sessions/Files. AuthProvider, hooks, query isolation, backend, API contracts, RBAC và business logic giữ nguyên; password/revoke/files vẫn ở view chức năng hiện có.

Verification: frontend `corepack pnpm typecheck`, `lint`, `test`, `build` PASS (158 tests/16 files, 15 static pages). Bốn test mới bảo vệ dữ liệu hợp nhất, một profile/resend và shortcuts theo permission; tests navigation/Chrome cập nhật kỳ vọng không có Info link. Chrome production runner A.1–B.4 PASS với API fixtures; MEMBER 17 frame/57 assertions/54 screenshots, gồm canonicalization/Back/Forward/request counts và responsive/keyboard ở 320/390/1440px.

Đã xem screenshots profile verified desktop, unverified mobile và focus disclosure ở 320px, không overflow ngang. Composition hợp nhất theo yêu cầu người dùng, dùng tokens/patterns hiện có; ảnh Figma tổng hợp không đủ chứng minh pixel-perfect. Fixtures không xác nhận live auth/OAuth/SMTP/DB/R2; không chạy backend checks vì không đổi backend/contracts. Technical debt setting validation/concurrency và quota upload đồng thời vẫn ngoài scope. Bằng chứng: [verification](../../tmp/account-merge-acceptance/verification.json), [regressions](../../tmp/account-merge-acceptance/b2-regressions.json), [desktop](../../tmp/account-merge-acceptance/b2-4-40985-account-verified-1440.png), [mobile](../../tmp/account-merge-acceptance/b2-4-40924-dashboard-mobile.png), [320px](../../tmp/account-merge-acceptance/b2-account-320.png).

## 20. Account self-service tabs và session table

Ngày: 2026-10-10. `/account` là trang duy nhất cho self-service account của MEMBER, ADMIN và SUPER_ADMIN. AccountPanel giữ bốn tab nội bộ: `Thông tin cá nhân` (`/account`), `Vai trò và quyền` (`/account?tab=roles`), `Bảo mật & mật khẩu` (`/account?tab=security`) và `Phiên đăng nhập` (`/account?tab=sessions`). `tab=info` tiếp tục canonicalize bằng `router.replace`; unknown tab vẫn hiển thị tab thông tin mà không tạo pathname mới.

Sidebar chỉ có một entry `Tài khoản của tôi` cho các tab account; `Tệp của tôi` vẫn là module riêng. Active sidebar dựa trên pathname `/account`, không đổi khi query tab thay đổi. Các entry quản trị vẫn lấy từ permission hiện có. EmailVerificationSetting hệ thống của SUPER_ADMIN vẫn ở `/super-admin`, không chuyển vào account cá nhân.

AccountSessions giữ API/hook/useLogout/ConfirmDialog hiện có và chỉ render dữ liệu thuộc user hiện tại. Khi có session, desktop luôn render bảng với các cột `Phiên`, `Tạo lúc`, `Hết hạn`, `Trạng thái`, `Thao tác`; một session là một hàng. Empty/error/loading/retry và revoke current/other giữ nguyên; dưới 768px bảng chuyển thành card responsive.

Không sửa backend, Prisma, API contracts, RBAC, ownership, AuthProvider, `/admin`, `/admin/users`, `/admin/audit-logs` hoặc `/super-admin`. Test navigation và browser fixture được cập nhật để kiểm tra một active sidebar, tab deep link, Back/Forward, 0/1/n sessions và responsive keyboard behavior.

Tabs dùng Link và query làm nguồn state duy nhất; navigation tạo history entry, alias info dùng replace. Có `tablist`, `tab`, `tabpanel`, `aria-selected`, tên panel và một tab stop; Left/Right/Home/End chuyển focus, Enter/Space kích hoạt, Tab vào panel. Tabs wrap ở màn hình hẹp, giữ token spacing/color/focus và touch target 44px. Không thêm shared primitive hay dependency.

Request flow giữ nguyên: GET `/api/v1/auth/me` → session.routes/authenticate → sessionController.me → sessionService.me/Prisma → AuthProvider; GET `/api/v1/auth/sessions` → session.routes/authenticate → sessionController.list → sessionService.list/Prisma → table/cards. Other revoke: DELETE `/api/v1/auth/sessions/:id` → authenticate/validateParams → sessionController.revoke → sessionService.revoke/Prisma. Current revoke: ConfirmDialog → useLogout → POST `/api/v1/auth/logout` → sessionController.logout → sessionService.logout/Prisma → clear provider/cache → `/login`. Password: POST `/api/v1/auth/password/change` → authenticate/validateBody → authController.changePassword → authService.changePassword/Prisma → reset form + metadata refresh. Business rules và ownership ở backend; không thêm repository hoặc layer.

Verification: frontend `corepack pnpm@9.15.9 typecheck`, `lint`, `test`, `build` PASS; 168 tests/16 files, 15 static pages; formatter và `git diff --check` PASS. Chrome production full A.1–B.4 PASS: Account 180 assertions, ADMIN 104, SUPER_ADMIN 104; MEMBER/ADMIN/SUPER_ADMIN có cùng bốn tab và 0/1/3 sessions tại 320/390/768/1280/1440px. Current/other revoke, lỗi/retry mutation, loading/empty/error/retry, expired/restore-error, Login/Logout, account isolation và Back/Forward được kiểm tra bằng HTTP fixtures. Đã xem ảnh desktop bảng 1 hàng, mobile card và 320px focus; không overflow ngang. Artifacts Git-ignored ở `tmp/account-tabs-acceptance/`. Không chạy backend checks hoặc live integration vì không thay backend/contracts.
