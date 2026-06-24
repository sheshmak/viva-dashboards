import { auth } from "@/auth";
import { getCachedGanttData } from "@/lib/wrikeCache";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await getCachedGanttData();
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch gantt data";
    console.error("[schedule/gantt-data]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


