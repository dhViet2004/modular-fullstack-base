import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./core/database/prisma.js";

const server = createApp({ corsOrigin: env.CORS_ORIGIN }).listen(
  env.PORT,
  () => {
    console.log(`CoreStack API listening on http://localhost:${env.PORT}`);
  },
);

async function shutdown(signal: string) {
  console.log(`${signal} received, shutting down`);
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  await prisma.$disconnect();
}

process.on("SIGINT", () => {
  void shutdown("SIGINT").then(() => process.exit(0));
});
process.on("SIGTERM", () => {
  void shutdown("SIGTERM").then(() => process.exit(0));
});
