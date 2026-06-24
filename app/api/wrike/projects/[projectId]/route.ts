import { auth } from "@/auth";
import { getWrikeClient } from "@/lib/wrike-service";
import { NextResponse } from "next/server";

export async function GET(_: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await params;

  try {
    const client = await getWrikeClient();
    const projects = await client.getProjects();
    const project = projects.find((p) => p.id === projectId);
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    return NextResponse.json(project);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch project";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
