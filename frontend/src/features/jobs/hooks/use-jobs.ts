"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { jobsApi } from "../api/jobs.api";
import type { CreateScheduledJobInput, UpdateScheduledJobInput } from "../types/job";

export const jobKeys = {
  all: ["jobs", "schedules"] as const,
  taskTypes: ["jobs", "task-types"] as const,
  detail: (id: string) => ["jobs", "schedules", id] as const
};

export const useScheduledJobs = () =>
  useQuery({
    queryKey: jobKeys.all,
    queryFn: jobsApi.list
  });

export const useTaskTypes = () =>
  useQuery({
    queryKey: jobKeys.taskTypes,
    queryFn: jobsApi.getTaskTypes
  });

export const useCreateScheduledJob = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateScheduledJobInput) => jobsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: jobKeys.all });
    }
  });
};

export const useUpdateScheduledJob = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateScheduledJobInput }) =>
      jobsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: jobKeys.all });
    }
  });
};

export const useDeleteScheduledJob = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => jobsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: jobKeys.all });
    }
  });
};

export const useTriggerRunNow = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => jobsApi.triggerNow(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: jobKeys.all });
    }
  });
};
