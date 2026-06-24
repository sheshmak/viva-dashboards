import { NextResponse } from "next/server";

export async function GET() {
  const base = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const params = new URLSearchParams({
    client_id: process.env.WRIKE_CLIENT_ID!,
    response_type: "code",
    redirect_uri: `${base}/api/connections/wrike/callback`,
    scope: "Default",
  });
  return NextResponse.redirect(
    `https://login.wrike.com/oauth2/authorize/v4?${params.toString()}`
  );
}
