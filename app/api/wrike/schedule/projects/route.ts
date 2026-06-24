import { auth } from "@/auth";
import { getWrikeClient } from "@/lib/getWrikeClient";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const client = await getWrikeClient().catch(() => null);
  if (!client) return NextResponse.json({ error: "Wrike not connected. An admin must connect Wrike in Admin → Connections." }, { status: 503 });

  try {
    const projects = await client.getAllScheduleProjects();
    return NextResponse.json({ data: projects });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch projects";
    console.error("[schedule/projects]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


