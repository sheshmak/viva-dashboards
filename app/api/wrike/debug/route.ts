import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "No session" }, { status: 401 });
  }

  const conn = await prisma.appConnection.findUnique({ where: { app: "wrike" } });
  if (!conn) return NextResponse.json({ error: "Wrike not connected" }, { status: 503 });

  const FOLDER_ID = "IEAA4TD3I4CJ65SL";
  const headers = { Authorization: `Bearer ${conn.accessToken}` };

  // Fetch subfolders with NO optional fields — just default response
  const res = await fetch(
    `https://www.wrike.com/api/v4/folders/${FOLDER_ID}/folders?pageSize=10`,
    { headers }
  );
  const json = await res.json();

  // Also fetch the parent folder itself
  const parentRes = await fetch(
    `https://www.wrike.com/api/v4/folders/${FOLDER_ID}`,
    { headers }
  );
  const parentJson = await parentRes.json();

  return NextResponse.json({
    parent: parentJson?.data?.[0] ?? parentJson,
    subfoldersStatus: res.status,
    subfoldersCount: json?.data?.length ?? 0,
    // Show full first item so we can see all available fields
    firstSubfolder: json?.data?.[0] ?? null,
    // Show all titles so we know what's in there
    titles: json?.data?.map((f: { title: string }) => f.title) ?? [],
    error: json?.error,
    errorDescription: json?.errorDescription,
  });
}
