import { auth } from "@/auth";
import { listDashboards } from "@/lib/dashboards";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const dashboards = await listDashboards(session);
  return NextResponse.json({ dashboards, isAdmin: session.user?.role === "ADMIN" });
}
