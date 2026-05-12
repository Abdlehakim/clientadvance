import { prisma } from "./config/prisma.js";
import { env } from "./config/env.js";
import { appServerApp } from "./appServerApp.js";

const server = appServerApp.listen(env.APP_SERVER_PORT, () => {
  console.log(`ClientAdvance App API listening on http://localhost:${env.APP_SERVER_PORT}`);
});

async function shutdown(signal: string) {
  console.log(`${signal} received. Shutting down app-server gracefully...`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});
