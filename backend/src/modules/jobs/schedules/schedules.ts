import { jobService } from "../job.service.js";

export const registerSchedules = async () => {
  await jobService.syncSchedulesFromDb();
};
