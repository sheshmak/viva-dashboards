import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session || session.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const conn = await prisma.appConnection.findUnique({ where: { id: "wrike" } });
  if (!conn) return NextResponse.json({ connected: false });

  return NextResponse.json({
    connected: true,
    expiresAt: new Date(Number(conn.expiresAt)).toISOString(),
    host: conn.host,
  });
}
