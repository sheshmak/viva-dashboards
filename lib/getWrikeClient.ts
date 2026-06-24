import { prisma } from "@/lib/db";
import { WrikeClient } from "@/lib/wrike";

export async function getWrikeClient(): Promise<WrikeClient> {
  const conn = await prisma.appConnection.findUnique({ where: { app: "wrike" } });
  if (!conn) {
    throw new Error("Wrike is not connected. An admin must connect Wrike in Admin → Connections.");
  }
  return new WrikeClient(conn.accessToken);
}
