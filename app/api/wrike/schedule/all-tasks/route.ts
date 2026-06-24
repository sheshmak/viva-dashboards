import { auth } from "@/auth";
import { getCachedAllTasks } from "@/lib/wrikeCache";
import { NextResponse } from "next/server";

function isoDate(d: Date) { return d.toISOString().slice(0, 10); }

export async function GET(req: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const now = new Date();
  const defaultStart = new Date(now); defaultStart.setDate(now.getDate() - 60);
  const defaultEnd   = new Date(now); defaultEnd.setDate(now.getDate() + 120);

  const start = searchParams.get("start") ?? isoDate(defaultStart);
  const end   = searchParams.get("end")   ?? isoDate(defaultEnd);

  try {
    const result = await getCachedAllTasks(start, end);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch tasks";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


