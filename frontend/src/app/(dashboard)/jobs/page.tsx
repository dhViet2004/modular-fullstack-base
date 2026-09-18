import { PageHead } from "@/components/shared/page-head";
import { JobsManager } from "@/features/jobs/components/jobs-manager";

export default function Page() {
  return (
    <>
      <PageHead
        title="Lịch trình công việc (Jobs & Schedules)"
        description="Lên lịch, dọn dẹp rác, bảo trì dữ liệu và tự động hóa các tác vụ định kỳ đồng hành cùng Server."
      />
      <JobsManager />
    </>
  );
}
