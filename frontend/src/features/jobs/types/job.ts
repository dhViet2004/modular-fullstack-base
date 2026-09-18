export type JobTaskType =
  | "CLEANUP_ORPHAN_FILES"
  | "CLEANUP_EXPIRED_SESSIONS"
  | "CLEANUP_CHALLENGES"
  | "CLEANUP_AUDIT_LOGS"
  | "UPDATE_INACTIVE_USERS"
  | "CUSTOM_TASK";

export interface ScheduledJobRecord {
  id: string;
  name: string;
  description: string | null;
  taskType: JobTaskType;
  queue: string;
  cron: string;
  payload: Record<string, unknown> | null;
  enabled: boolean;
  runOnServer: boolean;
  lastRunAt: string | null;
  lastStatus: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskTypeMetadata {
  type: JobTaskType;
  label: string;
  category: "DELETE" | "UPDATE" | "CUSTOM";
  defaultQueue: string;
  defaultCron: string;
  description: string;
}

export interface CreateScheduledJobInput {
  name: string;
  description?: string;
  taskType: JobTaskType;
  queue: string;
  cron: string;
  payload?: Record<string, unknown>;
  enabled?: boolean;
  runOnServer?: boolean;
}

export interface UpdateScheduledJobInput {
  name?: string;
  description?: string;
  taskType?: JobTaskType;
  queue?: string;
  cron?: string;
  payload?: Record<string, unknown>;
  enabled?: boolean;
  runOnServer?: boolean;
}
