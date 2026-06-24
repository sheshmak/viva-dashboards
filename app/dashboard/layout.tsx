import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { userCanAccessRoute } from "@/lib/dashboards";
import { AppSidebar } from "@/components/nav/AppSidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const pathname = (await headers()).get("x-pathname") ?? "";

  // The dashboards hub is always reachable; individual dashboards are gated.
  if (session && pathname && pathname !== "/dashboard/list") {
    const allowed = await userCanAccessRoute(session, pathname);
    if (!allowed) redirect("/dashboard/list");
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <AppSidebar />
      <main style={{ marginLeft: 220, flex: 1, minHeight: "100vh", overflow: "auto" }}>
        {children}
      </main>
    </div>
  );
}
