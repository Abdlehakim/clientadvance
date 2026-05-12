import { prisma } from "./config/prisma.js";
import { env } from "./config/env.js";
import { ownerApp } from "./ownerApp.js";

const server = ownerApp.listen(env.OWNER_SERVER_PORT, () => {
  console.log(`ClientAdvance Owner API listening on http://localhost:${env.OWNER_SERVER_PORT}`);
});

async function shutdown(signal: string) {
  console.log(`${signal} received. Shutting down owner-server gracefully...`);
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
