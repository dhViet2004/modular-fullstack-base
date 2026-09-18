import type { RequestHandler } from "express";
import { success } from "../../core/http/api-response.js";
import { ApiError } from "../../core/http/api-error.js";
import { scheduledJobRepository } from "./scheduled-job.repository.js";
import { jobService } from "./job.service.js";

const TASK_TYPE_METADATA = [
  {
    type: "CLEANUP_ORPHAN_FILES",
    label: "Dọn dẹp tệp mồ côi",
    category: "DELETE",
    defaultQueue: "files.cleanup-orphans",
    defaultCron: "0 2 * * *",
    description: "Quét và xóa vĩnh viễn các tệp vật lý mồ côi (referenceCount = 0) đã quá thời hạn lưu trữ"
  },
  {
    type: "CLEANUP_CHALLENGES",
    label: "Dọn dẹp mã OTP & Magic Link hết hạn",
    category: "DELETE",
    defaultQueue: "auth.cleanup-challenges",
    defaultCron: "0 * * * *",
    description: "Xóa các token OTP, xác minh email và magic link đã hết hạn hoặc đã sử dụng"
  },
  {
    type: "CLEANUP_EXPIRED_SESSIONS",
    label: "Thu hồi phiên đăng nhập hết hạn",
    category: "DELETE",
    defaultQueue: "sessions.cleanup-expired",
    defaultCron: "15 * * * *",
    description: "Thu hồi và đóng các phiên đăng nhập đã quá hạn hiệu lực"
  },
  {
    type: "CLEANUP_AUDIT_LOGS",
    label: "Dọn dẹp nhật ký kiểm toán cũ",
    category: "DELETE",
    defaultQueue: "system.cleanup-audit",
    defaultCron: "0 3 * * 0",
    description: "Xóa các bản ghi AuditLog cũ hơn số ngày chỉ định (mặc định 90 ngày) để giảm tải dữ liệu"
  },
  {
    type: "UPDATE_INACTIVE_USERS",
    label: "Cập nhật tài khoản không hoạt động",
    category: "UPDATE",
    defaultQueue: "users.update-inactive",
    defaultCron: "0 4 1 * *",
    description: "Quét và cập nhật trạng thái tạm khóa (SUSPENDED) cho người dùng không hoạt động trong X ngày"
  },
  {
    type: "CUSTOM_TASK",
    label: "Tác vụ bảo trì tùy biến",
    category: "CUSTOM",
    defaultQueue: "system.custom-task",
    defaultCron: "0 0 * * *",
    description: "Thực thi tác vụ tùy biến theo hàng đợi và tham số JSON cấu hình"
  }
];

export const jobController: { [k: string]: RequestHandler } = {
  getTaskTypes: (_req, res) => {
    res.json(success(TASK_TYPE_METADATA));
  },

  listSchedules: async (_req, res, next) => {
    try {
      const items = await scheduledJobRepository.list();
      res.json(success(items));
    } catch (e) {
      next(e);
    }
  },

  getScheduleById: async (req, res, next) => {
    try {
      const item = await scheduledJobRepository.findById(String(req.params.id));
      if (!item) throw new ApiError(404, "NOT_FOUND", "Lịch trình không tồn tại");
      res.json(success(item));
    } catch (e) {
      next(e);
    }
  },

  createSchedule: async (req, res, next) => {
    try {
      const { name, description, taskType, queue, cron, payload, enabled, runOnServer } = req.body;
      if (!name || !taskType || !queue || !cron) {
        throw new ApiError(400, "VALIDATION_ERROR", "Tên, loại tác vụ, queue và biểu thức cron là bắt buộc");
      }

      const created = await jobService.createSchedule({
        name: String(name).trim(),
        description: description ? String(description).trim() : null,
        taskType,
        queue: String(queue).trim(),
        cron: String(cron).trim(),
        payload: payload ?? {},
        enabled: enabled !== undefined ? Boolean(enabled) : true,
        runOnServer: runOnServer !== undefined ? Boolean(runOnServer) : true
      });

      res.status(201).json(success(created));
    } catch (e) {
      next(e);
    }
  },

  updateSchedule: async (req, res, next) => {
    try {
      const id = String(req.params.id);
      const updated = await jobService.updateSchedule(id, req.body);
      res.json(success(updated));
    } catch (e) {
      next(e);
    }
  },

  deleteSchedule: async (req, res, next) => {
    try {
      const id = String(req.params.id);
      await jobService.deleteSchedule(id);
      res.json(success({ deleted: true }));
    } catch (e) {
      next(e);
    }
  },

  triggerRunNow: async (req, res, next) => {
    try {
      const id = String(req.params.id);
      const result = await jobService.triggerNow(id);
      res.json(success(result));
    } catch (e) {
      next(e);
    }
  }
};
