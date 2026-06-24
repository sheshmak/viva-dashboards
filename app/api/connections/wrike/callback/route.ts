import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code  = searchParams.get("code");
  const error = searchParams.get("error");
  const base  = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  if (error || !code) {
    return NextResponse.redirect(`${base}/admin/connections?error=OAuthCallback`);
  }

  // Exchange code for tokens
  const tokenRes = await fetch("https://login.wrike.com/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type:    "authorization_code",
      code,
      redirect_uri:  `${base}/api/connections/wrike/callback`,
      client_id:     process.env.WRIKE_CLIENT_ID!,
      client_secret: process.env.WRIKE_CLIENT_SECRET!,
    }),
  });

  const tokenData = await tokenRes.json();
  if (!tokenRes.ok) {
    console.error("[Wrike OAuth] Token exchange failed:", tokenData);
    return NextResponse.redirect(`${base}/admin/connections?error=OAuthCallback`);
  }

  // Persist as a shared service-account connection (all app users share this token)
  await prisma.appConnection.upsert({
    where: { app: "wrike" },
    create: {
      id:           "wrike",
      app:          "wrike",
      accessToken:  tokenData.access_token,
      refreshToken: tokenData.refresh_token ?? "",
      expiresAt:    BigInt(Date.now() + (tokenData.expires_in ?? 3600) * 1000),
      host:         "www.wrike.com",
    },
    update: {
      accessToken:  tokenData.access_token,
      refreshToken: tokenData.refresh_token ?? "",
      expiresAt:    BigInt(Date.now() + (tokenData.expires_in ?? 3600) * 1000),
    },
  });

  return NextResponse.redirect(`${base}/admin/connections?connected=wrike`);
}
