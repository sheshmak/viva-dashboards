import { auth } from "@/auth";
import { getWrikeClient } from "@/lib/getWrikeClient";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const client = await getWrikeClient().catch(() => null);
  if (!client) return NextResponse.json({ error: "Wrike not connected. An admin must connect Wrike in Admin → Connections." }, { status: 503 });

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });

  try {
    const phases = await client.getProjectPhases(projectId);
    return NextResponse.json({ data: phases });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch phases";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


