import { auth } from "@/auth";
import { getWrikeClient } from "@/lib/getWrikeClient";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const client = await getWrikeClient().catch(() => null);
  if (!client) return NextResponse.json({ error: "Wrike not connected. An admin must connect Wrike in Admin → Connections." }, { status: 503 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? undefined;
  const contactId = searchParams.get("contactId");

  try {
    const tasks = contactId
      ? await client.getContactTasks(contactId)
      : await client.getMyTasks({ status: status ?? undefined });

    return NextResponse.json(tasks);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch tasks";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


