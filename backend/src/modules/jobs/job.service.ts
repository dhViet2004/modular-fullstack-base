import { PgBoss } from "pg-boss";
import { env } from "../../config/env.js";
import { logger } from "../../core/logger/logger.js";
import { scheduledJobRepository } from "./scheduled-job.repository.js";
import type { Prisma, JobTaskType } from "../../generated/prisma/client.js";

class JobService {
  boss = new PgBoss(env.DATABASE_URL);
  private started?: Promise<PgBoss>;

  start() {
    return (this.started ??= this.boss.start());
  }

  async stop() {
    if (this.started) {
      await this.boss.stop();
    }
    this.started = undefined;
  }

  async send(name: string, data: object) {
    if (env.NODE_ENV === "test") return null;
    await this.start();
    await this.boss.createQueue(name);
    return this.boss.send(name, data);
  }

  async schedule(name: string, cron: string, data: object = {}) {
    if (env.NODE_ENV === "test") return;
    await this.start();
    await this.boss.createQueue(name);
    return this.boss.schedule(name, cron, data);
  }

  async unschedule(name: string) {
    if (env.NODE_ENV === "test") return;
    await this.start();
    return this.boss.unschedule(name);
  }

  /**
   * Đồng bộ toàn bộ lịch trình đang bật từ Database vào bộ lập lịch pg-boss
   */
  async syncSchedulesFromDb() {
    try {
      await this.start();
      const enabledJobs = await scheduledJobRepository.listEnabled();
      logger.info(`[JobService] Đang đồng bộ ${enabledJobs.length} lịch trình công việc từ cơ sở dữ liệu...`);

      for (const job of enabledJobs) {
        try {
          await this.boss.createQueue(job.queue);
          await this.boss.schedule(job.queue, job.cron, (job.payload as object) || {});
          logger.info(`[JobService] Đã lập lịch tác vụ "${job.name}" (${job.queue} - ${job.cron})`);
        } catch (err) {
          logger.error(`[JobService] Lỗi khi nạp lịch trình "${job.name}":`, err);
        }
      }
    } catch (error) {
      logger.error("[JobService] Không thể đồng bộ lịch trình từ database:", error);
    }
  }

  /**
   * Kích hoạt một công việc chạy ngay lập tức (thủ công)
   */
  async triggerNow(id: string) {
    const job = await scheduledJobRepository.findById(id);
    if (!job) {
      throw new Error("Lịch trình công việc không tồn tại");
    }

    try {
      await this.send(job.queue, (job.payload as object) || {});
      await scheduledJobRepository.recordRunResult(id, "SUCCESS");
      logger.info(`[JobService] Đã kích hoạt chạy ngay công việc "${job.name}" vào queue "${job.queue}"`);
      return { success: true, message: `Đã đưa công việc "${job.name}" vào hàng đợi thực thi` };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await scheduledJobRepository.recordRunResult(id, "FAILED", msg);
      throw err;
    }
  }

  /**
   * Tạo lịch trình công việc mới
   */
  async createSchedule(data: {
    name: string;
    description?: string | null;
    taskType: JobTaskType;
    queue: string;
    cron: string;
    payload?: Prisma.InputJsonValue;
    enabled?: boolean;
    runOnServer?: boolean;
  }) {
    const newJob = await scheduledJobRepository.create(data);

    if (newJob.enabled) {
      try {
        await this.schedule(newJob.queue, newJob.cron, (newJob.payload as object) || {});
      } catch (err) {
        logger.error(`[JobService] Không thể đăng ký cron cho "${newJob.name}":`, err);
      }
    }

    return newJob;
  }

  /**
   * Cập nhật cấu hình lịch trình
   */
  async updateSchedule(
    id: string,
    data: {
      name?: string;
      description?: string | null;
      taskType?: JobTaskType;
      queue?: string;
      cron?: string;
      payload?: Prisma.InputJsonValue;
      enabled?: boolean;
      runOnServer?: boolean;
    }
  ) {
    const current = await scheduledJobRepository.findById(id);
    if (!current) throw new Error("Lịch trình không tồn tại");

    const updated = await scheduledJobRepository.update(id, data);

    try {
      // Hủy lịch trình cũ
      await this.unschedule(current.queue);

      // Nếu trạng thái vẫn bật thì lập lịch lại với cấu hình mới
      if (updated.enabled) {
        await this.schedule(updated.queue, updated.cron, (updated.payload as object) || {});
      }
    } catch (err) {
      logger.error(`[JobService] Lỗi khi cập nhật scheduler cho "${updated.name}":`, err);
    }

    return updated;
  }

  /**
   * Xóa lịch trình công việc
   */
  async deleteSchedule(id: string) {
    const current = await scheduledJobRepository.findById(id);
    if (!current) throw new Error("Lịch trình không tồn tại");

    try {
      await this.unschedule(current.queue);
    } catch (err) {
      logger.error(`[JobService] Lỗi khi hủy scheduler cho "${current.name}":`, err);
    }

    await scheduledJobRepository.delete(id);
    return { success: true };
  }
}

export const jobService = new JobService();
