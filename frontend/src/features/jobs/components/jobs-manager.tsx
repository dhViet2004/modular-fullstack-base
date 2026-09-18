"use client";

import React, { useMemo, useState } from "react";
import {
  FiClock,
  FiPlay,
  FiEdit3,
  FiTrash2,
  FiPlus,
  FiRefreshCw,
  FiCheckCircle,
  FiAlertCircle,
  FiCheck,
  FiX,
  FiLayers,
  FiCpu
} from "react-icons/fi";
import {
  useScheduledJobs,
  useTaskTypes,
  useCreateScheduledJob,
  useUpdateScheduledJob,
  useDeleteScheduledJob,
  useTriggerRunNow
} from "../hooks/use-jobs";
import type { ScheduledJobRecord, JobTaskType } from "../types/job";

const CRON_PRESETS = [
  { label: "Mỗi 15 phút", cron: "*/15 * * * *" },
  { label: "Mỗi giờ (phút thứ 0)", cron: "0 * * * *" },
  { label: "Hàng ngày lúc 02:00 sáng", cron: "0 2 * * *" },
  { label: "Hàng ngày lúc nửa đêm (00:00)", cron: "0 0 * * *" },
  { label: "Chủ nhật hàng tuần lúc 03:00", cron: "0 3 * * 0" },
  { label: "Ngày đầu tháng lúc 04:00", cron: "0 4 1 * *" }
];

const explainCron = (cron: string): string => {
  const c = cron.trim();
  if (c === "0 2 * * *") return "02:00 sáng hàng ngày";
  if (c === "0 * * * *") return "Mỗi giờ (phút thứ 0)";
  if (c === "15 * * * *") return "Mỗi giờ (phút thứ 15)";
  if (c === "*/15 * * * *") return "Mỗi 15 phút một lần";
  if (c === "0 3 * * 0") return "03:00 sáng Chủ nhật hàng tuần";
  if (c === "0 4 1 * *") return "04:00 sáng ngày 1 hàng tháng";
  if (c === "0 0 * * *") return "Nửa đêm (00:00) hàng ngày";
  return `Biểu thức: ${cron}`;
};

export function JobsManager() {
  const jobsQuery = useScheduledJobs();
  const typesQuery = useTaskTypes();

  const createMutation = useCreateScheduledJob();
  const updateMutation = useUpdateScheduledJob();
  const deleteMutation = useDeleteScheduledJob();
  const runMutation = useTriggerRunNow();

  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("ALL");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<ScheduledJobRecord | null>(null);
  const [deletingJob, setDeletingJob] = useState<ScheduledJobRecord | null>(null);

  // Form states
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formTaskType, setFormTaskType] = useState<JobTaskType>("CLEANUP_ORPHAN_FILES");
  const [formQueue, setFormQueue] = useState("files.cleanup-orphans");
  const [formCron, setFormCron] = useState("0 2 * * *");
  const [formPayloadStr, setFormPayloadStr] = useState("{}");
  const [formEnabled, setFormEnabled] = useState(true);
  const [formRunOnServer, setFormRunOnServer] = useState(true);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const jobs = useMemo(() => jobsQuery.data ?? [], [jobsQuery.data]);
  const taskTypes = useMemo(() => typesQuery.data ?? [], [typesQuery.data]);

  // Statistics
  const stats = useMemo(() => {
    const total = jobs.length;
    const active = jobs.filter((j) => j.enabled).length;
    const paused = total - active;
    const lastSuccess = jobs.filter((j) => j.lastStatus === "SUCCESS").length;
    return { total, active, paused, lastSuccess };
  }, [jobs]);

  // Filtered jobs
  const filteredJobs = useMemo(() => {
    return jobs.filter((j) => {
      const matchSearch =
        searchTerm === "" ||
        j.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        j.queue.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (j.description && j.description.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchType = filterType === "ALL" || j.taskType === filterType;
      return matchSearch && matchType;
    });
  }, [jobs, searchTerm, filterType]);

  const handleOpenCreate = () => {
    const defaultMeta = taskTypes[0];
    setFormName("Công việc định kỳ mới");
    setFormDescription("");
    setFormTaskType(defaultMeta?.type || "CLEANUP_ORPHAN_FILES");
    setFormQueue(defaultMeta?.defaultQueue || "files.cleanup-orphans");
    setFormCron(defaultMeta?.defaultCron || "0 2 * * *");
    setFormPayloadStr("{}");
    setFormEnabled(true);
    setFormRunOnServer(true);
    setIsCreateOpen(true);
  };

  const handleTaskTypeChange = (newType: JobTaskType) => {
    setFormTaskType(newType);
    const meta = taskTypes.find((t) => t.type === newType);
    if (meta) {
      setFormQueue(meta.defaultQueue);
      setFormCron(meta.defaultCron);
      if (!formDescription || formDescription === "") {
        setFormDescription(meta.description);
      }
    }
  };

  const handleOpenEdit = (job: ScheduledJobRecord) => {
    setEditingJob(job);
    setFormName(job.name);
    setFormDescription(job.description || "");
    setFormTaskType(job.taskType);
    setFormQueue(job.queue);
    setFormCron(job.cron);
    setFormPayloadStr(JSON.stringify(job.payload ?? {}, null, 2));
    setFormEnabled(job.enabled);
    setFormRunOnServer(job.runOnServer);
  };

  const handleSaveCreate = async () => {
    let payload = {};
    try {
      if (formPayloadStr.trim()) {
        payload = JSON.parse(formPayloadStr);
      }
    } catch {
      alert("Dữ liệu Payload phải là cú pháp JSON hợp lệ!");
      return;
    }

    try {
      await createMutation.mutateAsync({
        name: formName.trim(),
        description: formDescription.trim() || undefined,
        taskType: formTaskType,
        queue: formQueue.trim(),
        cron: formCron.trim(),
        payload,
        enabled: formEnabled,
        runOnServer: formRunOnServer
      });
      setIsCreateOpen(false);
      showToast(`Đã thêm lịch trình "${formName}" thành công!`);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } }; message?: string };
      alert(e?.response?.data?.error?.message || e?.message || "Tạo lịch trình thất bại.");
    }
  };

  const handleSaveEdit = async () => {
    if (!editingJob) return;
    let payload = {};
    try {
      if (formPayloadStr.trim()) {
        payload = JSON.parse(formPayloadStr);
      }
    } catch {
      alert("Dữ liệu Payload phải là cú pháp JSON hợp lệ!");
      return;
    }

    try {
      await updateMutation.mutateAsync({
        id: editingJob.id,
        data: {
          name: formName.trim(),
          description: formDescription.trim() || undefined,
          taskType: formTaskType,
          queue: formQueue.trim(),
          cron: formCron.trim(),
          payload,
          enabled: formEnabled,
          runOnServer: formRunOnServer
        }
      });
      setEditingJob(null);
      showToast(`Đã cập nhật lịch trình "${formName}" thành công!`);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } }; message?: string };
      alert(e?.response?.data?.error?.message || e?.message || "Cập nhật thất bại.");
    }
  };

  const handleToggleEnabled = async (job: ScheduledJobRecord) => {
    try {
      await updateMutation.mutateAsync({
        id: job.id,
        data: { enabled: !job.enabled }
      });
      showToast(
        !job.enabled
          ? `Đã kích hoạt lịch trình "${job.name}".`
          : `Đã tạm dừng lịch trình "${job.name}".`
      );
    } catch {
      showToast("Không thể thay đổi trạng thái lịch trình.");
    }
  };

  const handleTriggerNow = async (job: ScheduledJobRecord) => {
    try {
      await runMutation.mutateAsync(job.id);
      showToast(`Đã kích hoạt chạy ngay công việc "${job.name}" thành công!`);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } }; message?: string };
      alert(e?.response?.data?.error?.message || e?.message || "Kích hoạt chạy ngay thất bại.");
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingJob) return;
    try {
      await deleteMutation.mutateAsync(deletingJob.id);
      setDeletingJob(null);
      showToast(`Đã xóa lịch trình "${deletingJob.name}".`);
    } catch {
      showToast("Xóa lịch trình thất bại.");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Thông báo Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs px-4 py-3 rounded-lg shadow-xl flex items-center gap-2 border border-slate-700 animate-fadeIn">
          <FiCheck className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header & Thống kê */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <FiClock className="w-6 h-6 text-indigo-600" />
            <span>Quản Lý Lịch Trình Công Việc (Jobs & Schedules)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Lên lịch tự động hóa các tác vụ xóa rác, bảo trì dữ liệu, dọn phiên đăng nhập và cập nhật trạng thái theo chu
            kỳ. Chạy đồng hành cùng Web Server hoặc Worker.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn secondary sm inline-flex items-center gap-1.5"
            onClick={() => jobsQuery.refetch()}
            disabled={jobsQuery.isFetching}
          >
            <FiRefreshCw className={`w-3.5 h-3.5 ${jobsQuery.isFetching ? "spin" : ""}`} />
            <span>Làm mới</span>
          </button>
          <button
            type="button"
            className="btn sm inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
            onClick={handleOpenCreate}
          >
            <FiPlus className="w-4 h-4" />
            <span>Thêm lịch trình mới</span>
          </button>
        </div>
      </div>

      {/* Các thẻ chỉ số Thống kê */}
      <section className="stats-grid">
        <div className="stat">
          <div className="stat-icon">
            <FiLayers size={20} />
          </div>
          <div>
            <strong>{stats.total}</strong>
            <span>Tổng số công việc</span>
          </div>
        </div>

        <div className="stat success">
          <div className="stat-icon">
            <FiCheckCircle size={20} />
          </div>
          <div>
            <strong>{stats.active}</strong>
            <span>Đang hoạt động (Active)</span>
          </div>
        </div>

        <div className="stat warn">
          <div className="stat-icon">
            <FiClock size={20} />
          </div>
          <div>
            <strong>{stats.paused}</strong>
            <span>Đang tạm dừng</span>
          </div>
        </div>

        <div className="stat">
          <div className="stat-icon">
            <FiCpu size={20} />
          </div>
          <div>
            <strong>Tích hợp Server</strong>
            <span>Chạy in-process / Worker</span>
          </div>
        </div>
      </section>

      {/* Bảng Danh sách Công việc */}
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Danh sách Lịch trình Công việc</h2>
            <p>Các tác vụ được lập lịch thực thi định kỳ qua pg-boss scheduler và cơ sở dữ liệu.</p>
          </div>

          <div className="head-actions">
            <input
              type="text"
              placeholder="Tìm kiếm công việc, hàng đợi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input sm"
              style={{ minWidth: 220 }}
            />

            <select
              className="select sm"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              style={{ width: "auto" }}
            >
              <option value="ALL">Tất cả loại tác vụ</option>
              {taskTypes.map((t) => (
                <option key={t.type} value={t.type}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {jobsQuery.isLoading ? (
          <div className="loading">Đang tải danh sách công việc…</div>
        ) : filteredJobs.length === 0 ? (
          <div className="empty">
            <FiClock size={36} color="var(--muted)" />
            <h3 style={{ margin: "10px 0 4px" }}>Không tìm thấy công việc nào</h3>
            <p style={{ color: "var(--muted)", fontSize: 13 }}>Hãy tạo một lịch trình công việc mới để tự động hóa.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Tên công việc & Hàng đợi</th>
                  <th>Phân loại</th>
                  <th>Lịch trình (Cron)</th>
                  <th>Trạng thái</th>
                  <th>Lần chạy gần nhất</th>
                  <th style={{ textAlign: "right" }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredJobs.map((job) => {
                  const isSuccess = job.lastStatus === "SUCCESS";
                  const isFailed = job.lastStatus === "FAILED";

                  return (
                    <tr key={job.id}>
                      <td>
                        <div className="flex flex-col">
                          <strong className="text-slate-900 text-sm flex items-center gap-1.5">
                            {job.name}
                            {job.runOnServer && (
                              <span
                                className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-normal border border-indigo-200"
                                title="Công việc chạy tự động cùng Web Server"
                              >
                                Server
                              </span>
                            )}
                          </strong>
                          <span className="text-xs text-slate-500 font-mono mt-0.5">
                            Queue: <span className="text-slate-700">{job.queue}</span>
                          </span>
                          {job.description && (
                            <span className="text-xs text-slate-400 mt-1 line-clamp-1">{job.description}</span>
                          )}
                        </div>
                      </td>

                      <td>
                        <span
                          className={`badge ${
                            job.taskType.startsWith("CLEANUP")
                              ? "neutral"
                              : job.taskType.startsWith("UPDATE")
                              ? "success"
                              : ""
                          }`}
                        >
                          {job.taskType}
                        </span>
                      </td>

                      <td>
                        <div className="flex flex-col">
                          <code className="text-xs font-mono font-semibold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded w-fit">
                            {job.cron}
                          </code>
                          <span className="text-xs text-slate-500 mt-1">{explainCron(job.cron)}</span>
                        </div>
                      </td>

                      <td>
                        <button
                          type="button"
                          onClick={() => handleToggleEnabled(job)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                            job.enabled
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                              : "bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200"
                          }`}
                          title="Nhấp để bật hoặc tạm dừng lịch trình này"
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${job.enabled ? "bg-emerald-500" : "bg-slate-400"}`}
                          />
                          <span>{job.enabled ? "Đang chạy" : "Tạm dừng"}</span>
                        </button>
                      </td>

                      <td>
                        <div className="flex flex-col text-xs">
                          {job.lastRunAt ? (
                            <>
                              <span className="text-slate-700 font-medium">
                                {new Date(job.lastRunAt).toLocaleString("vi-VN")}
                              </span>
                              <span
                                className={`mt-0.5 font-medium ${
                                  isSuccess ? "text-emerald-600" : isFailed ? "text-rose-600" : "text-slate-500"
                                }`}
                              >
                                {isSuccess ? "✓ Thành công" : isFailed ? `✗ Lỗi: ${job.lastError || "Thất bại"}` : "Chờ"}
                              </span>
                            </>
                          ) : (
                            <span className="text-slate-400">Chưa chạy lần nào</span>
                          )}
                        </div>
                      </td>

                      <td>
                        <div className="actions">
                          <button
                            type="button"
                            className="btn secondary sm"
                            disabled={runMutation.isPending}
                            onClick={() => handleTriggerNow(job)}
                            title="Kích hoạt công việc này chạy ngay lập tức"
                          >
                            <FiPlay size={12} className="text-indigo-600" />
                            <span>Chạy ngay</span>
                          </button>

                          <button
                            type="button"
                            className="btn secondary sm"
                            onClick={() => handleOpenEdit(job)}
                            title="Chỉnh sửa cấu hình hoặc biểu thức Cron"
                          >
                            <FiEdit3 size={12} />
                            <span>Sửa</span>
                          </button>

                          <button
                            type="button"
                            className="btn danger sm"
                            onClick={() => setDeletingJob(job)}
                            title="Xóa lịch trình công việc này"
                          >
                            <FiTrash2 size={12} />
                            <span>Xóa</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* MODAL: TẠO MỚI / SỬA LỊCH TRÌNH */}
      {(isCreateOpen || editingJob) && (
        <div
          className="modal-overlay"
          onClick={() => {
            setIsCreateOpen(false);
            setEditingJob(null);
          }}
        >
          <div className="modal-dialog md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="text-slate-900 flex items-center gap-2">
                <FiClock className="w-5 h-5 text-indigo-600" />
                <span>{editingJob ? `Sửa lịch trình: ${editingJob.name}` : "Tạo Lịch Trình Công Việc Mới"}</span>
              </h3>
              <button
                type="button"
                className="modal-close"
                onClick={() => {
                  setIsCreateOpen(false);
                  setEditingJob(null);
                }}
                aria-label="Đóng"
              >
                <FiX size={18} />
              </button>
            </div>

            <div className="modal-body flex flex-col gap-3.5">
              {/* Loại tác vụ */}
              <label className="field">
                <span className="font-semibold text-xs text-slate-700">Loại tác vụ (Task Type):</span>
                <select
                  className="select"
                  value={formTaskType}
                  onChange={(e) => handleTaskTypeChange(e.target.value as JobTaskType)}
                >
                  {taskTypes.map((t) => (
                    <option key={t.type} value={t.type}>
                      {t.label} ({t.category === "DELETE" ? "Xóa" : t.category === "UPDATE" ? "Cập nhật" : "Tùy biến"})
                    </option>
                  ))}
                </select>
              </label>

              {/* Tên công việc */}
              <label className="field">
                <span className="font-semibold text-xs text-slate-700">Tên công việc:</span>
                <input
                  type="text"
                  className="input"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Nhập tên mô tả công việc..."
                />
              </label>

              {/* Hàng đợi Queue */}
              <label className="field">
                <span className="font-semibold text-xs text-slate-700">Tên hàng đợi (Queue):</span>
                <input
                  type="text"
                  className="input font-mono text-xs"
                  value={formQueue}
                  onChange={(e) => setFormQueue(e.target.value)}
                  placeholder="vd: files.cleanup-orphans, system.cleanup-audit"
                />
              </label>

              {/* Biểu thức Cron & Gợi ý */}
              <div className="field">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-xs text-slate-700">Lịch chạy (Biểu thức Cron 5 trường):</span>
                  <span className="text-xs text-indigo-600 font-medium">{explainCron(formCron)}</span>
                </div>
                <input
                  type="text"
                  className="input font-mono text-xs"
                  value={formCron}
                  onChange={(e) => setFormCron(e.target.value)}
                  placeholder="vd: 0 2 * * * (Phút Giờ Ngày Tháng Thứ)"
                />

                {/* Nút chọn nhanh Cron Preset */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="text-[11px] text-slate-400 self-center mr-1">Mẫu nhanh:</span>
                  {CRON_PRESETS.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setFormCron(p.cron)}
                      className={`text-[11px] px-2 py-0.5 rounded border transition-colors ${
                        formCron === p.cron
                          ? "bg-indigo-50 border-indigo-300 text-indigo-700 font-semibold"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tham số Payload JSON */}
              <label className="field">
                <span className="font-semibold text-xs text-slate-700">Tham số công việc (Payload JSON):</span>
                <textarea
                  rows={3}
                  className="textarea font-mono text-xs"
                  value={formPayloadStr}
                  onChange={(e) => setFormPayloadStr(e.target.value)}
                  placeholder='{"retentionDays": 90}'
                />
                <span className="text-[11px] text-slate-400 mt-1">
                  Ví dụ: <code>{`{"retentionDays": 90}`}</code> (cho dọn rác/audit) hoặc{" "}
                  <code>{`{"inactiveDays": 180, "targetStatus": "SUSPENDED"}`}</code>.
                </span>
              </label>

              {/* Tùy chọn Bật/Tắt & Chạy theo server */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formEnabled}
                    onChange={(e) => setFormEnabled(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <span>Kích hoạt lịch trình ngay sau khi lưu</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formRunOnServer}
                    onChange={(e) => setFormRunOnServer(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <span>Chạy trực tiếp cùng Web Server (in-process)</span>
                </label>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn secondary"
                onClick={() => {
                  setIsCreateOpen(false);
                  setEditingJob(null);
                }}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="btn bg-indigo-600 text-white hover:bg-indigo-700"
                disabled={createMutation.isPending || updateMutation.isPending || !formName.trim() || !formCron.trim()}
                onClick={editingJob ? handleSaveEdit : handleSaveCreate}
              >
                <span>{editingJob ? "Lưu thay đổi" : "Tạo lịch trình"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: XÁC NHẬN XÓA LỊCH TRÌNH */}
      {deletingJob && (
        <div className="modal-overlay" onClick={() => setDeletingJob(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="text-rose-600 flex items-center gap-2">
                <FiAlertCircle size={18} />
                <span>Xác nhận xóa lịch trình</span>
              </h3>
              <button
                type="button"
                className="modal-close"
                onClick={() => setDeletingJob(null)}
                aria-label="Đóng"
              >
                <FiX size={18} />
              </button>
            </div>

            <div className="modal-body">
              <p className="text-sm text-slate-700 mb-3">
                Bạn có chắc chắn muốn xóa lịch trình <strong>{deletingJob.name}</strong>?
              </p>
              <div className="notice" style={{ margin: 0, background: "#fff0f2", color: "var(--danger)" }}>
                Hành động này sẽ hủy đăng ký cron trong pg-boss và xóa bản ghi khỏi cơ sở dữ liệu.
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn secondary"
                onClick={() => setDeletingJob(null)}
                disabled={deleteMutation.isPending}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="btn danger"
                onClick={handleConfirmDelete}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? "Đang xóa…" : "Xóa lịch trình"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
