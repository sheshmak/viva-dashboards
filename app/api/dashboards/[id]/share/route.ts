import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user?.role !== "ADMIN") return null;
  return session;
}

// GET — current share list for a dashboard (admin only)
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const accesses = await prisma.userAccess.findMany({ where: { dashboardId: id } });
  return NextResponse.json({ userIds: accesses.map((a) => a.userId) });
}

// PUT — replace the set of users a dashboard is shared with (admin only)
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;

  const dashboard = await prisma.dashboard.findUnique({ where: { id } });
  if (!dashboard) {
    return NextResponse.json({ error: "Dashboard not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const userIds: string[] = Array.isArray(body.userIds) ? body.userIds : [];

  // Validate the user IDs actually exist before wiring up access.
  const validUsers = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true },
  });
  const validIds = validUsers.map((u) => u.id);

  await prisma.$transaction([
    prisma.userAccess.deleteMany({ where: { dashboardId: id } }),
    ...validIds.map((userId) =>
      prisma.userAccess.create({ data: { userId, dashboardId: id } })
    ),
  ]);

  return NextResponse.json({ userIds: validIds });
}
