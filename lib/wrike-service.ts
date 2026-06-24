import { prisma } from "@/lib/db";
import { WrikeClient } from "@/lib/wrike";

export async function getWrikeClient(): Promise<WrikeClient> {
  const conn = await prisma.appConnection.findUnique({ where: { id: "wrike" } });
  if (!conn) throw new Error("WRIKE_NOT_CONNECTED");

  // Refresh if within 5 min of expiry
  if (BigInt(Date.now()) > conn.expiresAt - BigInt(5 * 60 * 1000)) {
    const data = await refreshWrikeToken(conn.refreshToken);
    return new WrikeClient(data.access_token);
  }

  return new WrikeClient(conn.accessToken);
}

export async function refreshWrikeToken(refreshToken: string) {
  const res = await fetch(`https://login.wrike.com/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: process.env.WRIKE_CLIENT_ID!,
      client_secret: process.env.WRIKE_CLIENT_SECRET!,
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error("Failed to refresh Wrike token: " + JSON.stringify(data));

  await prisma.appConnection.update({
    where: { id: "wrike" },
    data: {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? refreshToken,
      expiresAt: BigInt(Date.now() + data.expires_in * 1000),
      host: data.host ?? "www.wrike.com",
    },
  });

  return data;
}

export async function saveWrikeConnection(tokenData: {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  host?: string;
}) {
  await prisma.appConnection.upsert({
    where: { id: "wrike" },
    create: {
      id: "wrike",
      app: "wrike",
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: BigInt(Date.now() + tokenData.expires_in * 1000),
      host: tokenData.host ?? "www.wrike.com",
    },
    update: {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: BigInt(Date.now() + tokenData.expires_in * 1000),
      host: tokenData.host ?? "www.wrike.com",
    },
  });
}
