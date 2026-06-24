import { AppSidebar } from "@/components/nav/AppSidebar";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <AppSidebar />
      <main style={{ marginLeft: 220, flex: 1, minHeight: "100vh", background: "var(--ground)", overflow: "auto" }}>
        {children}
      </main>
    </div>
  );
}
