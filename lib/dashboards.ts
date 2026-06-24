import { prisma } from "@/lib/db";

/**
 * Canonical list of built-in Wrike dashboards.
 * `type` is the stable slug used to find/seed the DB record.
 * `route` is where the dashboard lives; `icon` is a key rendered by the list UI.
 * Order controls display order — Consolidated Projects Dashboard is always first.
 */
export interface BuiltinDashboard {
  type: string;
  name: string;
  description: string;
  route: string;
  icon: string;
  order: number;
}

export const BUILTIN_DASHBOARDS: BuiltinDashboard[] = [
  {
    type: "consolidated",
    name: "Consolidated Projects Dashboard",
    description: "Leadership Gantt + portfolio view of every active project, with department phases and health.",
    route: "/dashboard",
    icon: "grid",
    order: 0,
  },
];

export interface DashboardItem {
  id: string;
  type: string;
  name: string;
  description: string;
  route: string;
  icon: string;
  order: number;
  isPublic: boolean;
  /** Only populated for admins — user IDs this dashboard is shared with. */
  sharedUserIds: string[];
}

interface SessionLike {
  user?: { id?: string; role?: string };
}

/** Idempotently ensure every built-in dashboard exists in the DB. */
export async function seedBuiltinDashboards(): Promise<void> {
  for (const d of BUILTIN_DASHBOARDS) {
    const existing = await prisma.dashboard.findFirst({ where: { type: d.type } });
    if (existing) continue;
    await prisma.dashboard.create({
      data: {
        name: d.name,
        description: d.description,
        type: d.type,
        order: d.order,
        isPublic: false,
        config: JSON.stringify({ route: d.route, icon: d.icon }),
      },
    });
  }
}

function parseConfig(config: string | null): { route: string; icon: string } {
  if (!config) return { route: "/dashboard", icon: "grid" };
  try {
    const c = JSON.parse(config);
    return { route: c.route ?? "/dashboard", icon: c.icon ?? "grid" };
  } catch {
    return { route: "/dashboard", icon: "grid" };
  }
}

/**
 * Return the dashboards visible to the given session.
 * Admins see all dashboards (with `sharedUserIds` populated).
 * Non-admins see only public dashboards and those shared with them.
 */
export async function listDashboards(session: SessionLike): Promise<DashboardItem[]> {
  await seedBuiltinDashboards();

  const rows = await prisma.dashboard.findMany({
    orderBy: { order: "asc" },
    include: { accesses: true },
  });

  const isAdmin = session.user?.role === "ADMIN";
  const userId = session.user?.id ?? "";

  const items: DashboardItem[] = rows.map((d) => {
    const { route, icon } = parseConfig(d.config);
    return {
      id: d.id,
      type: d.type,
      name: d.name,
      description: d.description ?? "",
      route,
      icon,
      order: d.order,
      isPublic: d.isPublic,
      sharedUserIds: d.accesses.filter((a) => a.dashboardId === d.id).map((a) => a.userId),
    };
  });

  if (isAdmin) return items;

  return items
    .filter((d) => d.isPublic || d.sharedUserIds.includes(userId))
    .map((d) => ({ ...d, sharedUserIds: [] })); // don't leak share list to viewers
}

/**
 * Whether the session may open the dashboard that owns `pathname`.
 * Admins and public dashboards are always allowed. Unknown routes
 * (e.g. /dashboard/list) are allowed — only known dashboards are gated.
 */
export async function userCanAccessRoute(session: SessionLike, pathname: string): Promise<boolean> {
  if (session.user?.role === "ADMIN") return true;

  await seedBuiltinDashboards();
  const rows = await prisma.dashboard.findMany({ include: { accesses: true } });

  // Longest matching route wins (so /dashboard/projects beats /dashboard).
  let best: (typeof rows)[number] | null = null;
  let bestLen = -1;
  for (const d of rows) {
    const { route } = parseConfig(d.config);
    const match = pathname === route || pathname.startsWith(route + "/");
    if (match && route.length > bestLen) {
      best = d;
      bestLen = route.length;
    }
  }

  if (!best) return true; // not a gated dashboard route
  if (best.isPublic) return true;
  const userId = session.user?.id ?? "";
  return best.accesses.some((a) => a.dashboardId === best!.id && a.userId === userId);
}
