import cors from "cors";
import express from "express";
import helmet from "helmet";
import { checkDatabaseConnection } from "./core/database/prisma.js";
import { successResponse } from "./core/http/api-response.js";
import { errorMiddleware } from "./middleware/error.middleware.js";
import { apiRouter } from "./routes/index.js";

type AppOptions = {
  corsOrigin?: string;
  checkDatabase?: () => Promise<void>;
};

export function createApp(options: AppOptions = {}) {
  const app = express();
  const checkDatabase = options.checkDatabase ?? checkDatabaseConnection;

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(
    cors({
      origin: options.corsOrigin ?? "http://localhost:3000",
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.get("/health", (_request, response) => {
    response.json(successResponse({ status: "ok", service: "api" }));
  });
  app.get("/ready", async (_request, response) => {
    try {
      await checkDatabase();
      response.json(
        successResponse({ status: "ready", dependencies: { database: "up" } }),
      );
    } catch {
      response.status(503).json({
        success: false,
        error: {
          code: "SERVICE_UNAVAILABLE",
          message: "Dịch vụ tạm thời chưa sẵn sàng",
        },
        meta: { timestamp: new Date().toISOString() },
      });
    }
  });
  app.use("/api/v1", apiRouter);
  app.use(errorMiddleware);
  return app;
}
