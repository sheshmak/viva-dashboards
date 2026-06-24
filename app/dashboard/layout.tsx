import { AppSidebar } from "@/components/nav/AppSidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <AppSidebar />
      <main style={{ marginLeft: 220, flex: 1, minHeight: "100vh", overflow: "auto" }}>
        {children}
      </main>
    </div>
  );
}
