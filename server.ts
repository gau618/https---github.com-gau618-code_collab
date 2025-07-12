import { Server } from "@hocuspocus/server";
import { Database } from "@hocuspocus/extension-database";
import { PrismaClient } from "@prisma/client";
import { decode } from "next-auth/jwt";

const prisma = new PrismaClient();
const PORT = Number(process.env.HOCUSPOCUS_PORT ?? 8081);
const JWT_KEY = process.env.NEXTAUTH_SECRET!;

const hocuspocus = new Server({
  port: PORT,
  authenticationTimeout: 2000,

  cors: {
    origin: ["http://localhost:3000"],
    credentials: true,
  },

  async onAuthenticate({ token }) {
    console.log("🔐 onAuthenticate called");

    if (!token) {
      console.error("❌ No token received");
      throw new Error("no-token");
    }

    const payload = await decode({ token: token as string, secret: JWT_KEY });

    if (!payload?.sub) {
      console.error("🚨 Invalid token: no sub");
      throw new Error("invalid-token");
    }

    console.log("✅ Token valid, userId:", payload.sub);
     return { userId: payload.sub as string };
  },

  extensions: [
    new Database({
      fetch: async ({ documentName }) => {
        const file = await prisma.file.findUnique({
          where: { id: documentName },
          select: { content: true },
        });
        return file?.content ?? null;
      },

      store: async ({ documentName, state }) => {
        await prisma.file.update({
          where: { id: documentName },
          data: { content: state, updatedAt: new Date() },
        });
      },

      debounce: 10_000,
      maxDebounce: 30_000,
    }),
  ],

  onConnect: ({ documentName, context }) =>
    console.log("➕ Connected", context.userId, "→", documentName),
  onDisconnect: ({ documentName, context }) =>
    console.log("➖ Disconnected", context.userId, "→", documentName),

  async beforeShutdown() {
    await prisma.$disconnect();
  },
});

hocuspocus.listen().then(() => {
  console.log(`🚀 Hocuspocus running at ws://localhost:${PORT}`);
});

for (const sig of ["SIGINT", "SIGTERM"] as const) {
  process.on(sig, async () => {
    await hocuspocus.destroy();
    await prisma.$disconnect();
    process.exit(0);
  });
}