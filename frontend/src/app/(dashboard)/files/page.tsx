import { PageHead } from "@/components/shared/page-head";
import { FileManager } from "@/features/files/components/file-manager";

export default function Page() {
  return (
    <>
      <PageHead
        title="Quản lý tệp tin"
        description="Tải lên, tải xuống, tìm kiếm, xem trước và quản lý an toàn toàn bộ tài liệu lưu trữ."
      />
      <FileManager />
    </>
  );
}
