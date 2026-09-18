import { api } from "@/lib/axios/client";
import type {
  ScheduledJobRecord,
  TaskTypeMetadata,
  CreateScheduledJobInput,
  UpdateScheduledJobInput
} from "../types/job";

export const jobsApi = {
  list: () =>
    api.get("/jobs/schedules").then((r) => r.data.data as ScheduledJobRecord[]),

  getTaskTypes: () =>
    api.get("/jobs/task-types").then((r) => r.data.data as TaskTypeMetadata[]),

  getById: (id: string) =>
    api.get(`/jobs/schedules/${id}`).then((r) => r.data.data as ScheduledJobRecord),

  create: (data: CreateScheduledJobInput) =>
    api.post("/jobs/schedules", data).then((r) => r.data.data as ScheduledJobRecord),

  update: (id: string, data: UpdateScheduledJobInput) =>
    api.patch(`/jobs/schedules/${id}`, data).then((r) => r.data.data as ScheduledJobRecord),

  delete: (id: string) =>
    api.delete(`/jobs/schedules/${id}`).then((r) => r.data.data as { deleted: boolean }),

  triggerNow: (id: string) =>
    api.post(`/jobs/schedules/${id}/run`).then((r) => r.data.data as { success: boolean; message: string })
};
