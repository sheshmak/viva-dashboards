import { prisma } from "@/lib/db";
import { WrikeClient } from "@/lib/wrike";

export async function getWrikeClient(): Promise<WrikeClient> {
  // Prefer a static permanent access token from the environment — no OAuth /
  // per-user connection needed. Falls back to a stored DB connection if unset.
  const envToken = process.env.WRIKE_ACCESS_TOKEN;
  if (envToken) {
    return new WrikeClient(envToken);
  }

  const conn = await prisma.appConnection.findUnique({ where: { app: "wrike" } });
  if (!conn) {
    throw new Error("Wrike is not connected. Set WRIKE_ACCESS_TOKEN in .env.local or connect Wrike in Admin → Connections.");
  }
  return new WrikeClient(conn.accessToken);
}
