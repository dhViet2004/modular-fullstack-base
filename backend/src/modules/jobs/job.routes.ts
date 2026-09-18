import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.middleware.js";
import { jobController as c } from "./job.controller.js";

export const jobRoutes = Router();

jobRoutes.use(authenticate);

jobRoutes.get("/task-types", c.getTaskTypes);
jobRoutes.get("/schedules", c.listSchedules);
jobRoutes.get("/schedules/:id", c.getScheduleById);
jobRoutes.post("/schedules", c.createSchedule);
jobRoutes.patch("/schedules/:id", c.updateSchedule);
jobRoutes.delete("/schedules/:id", c.deleteSchedule);
jobRoutes.post("/schedules/:id/run", c.triggerRunNow);
