"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "Overview",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    href: "/dashboard/tasks",
    label: "My Tasks",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
      </svg>
    ),
  },
  {
    href: "/dashboard/projects",
    label: "Projects",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
      </svg>
    ),
  },
  {
    href: "/dashboard/team",
    label: "Team",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
  },
  {
    href: "/dashboard/spaces",
    label: "Spaces",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
      </svg>
    ),
  },
  {
    href: "/dashboard/schedule",
    label: "Schedule",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <line x1="3" y1="6" x2="21" y2="6" />
        <rect x="3" y="10" width="9" height="3" rx="1.5" />
        <rect x="6" y="15" width="15" height="3" rx="1.5" />
      </svg>
    ),
  },
];

export function Rail() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const name = session?.user?.name ?? "User";

  return (
    <nav
      className="fixed left-0 top-0 bottom-0 w-16 bg-ground-2 border-r border-[var(--border)] flex flex-col items-center py-5 gap-1 z-50"
      aria-label="Main navigation"
    >
      {/* Logo mark */}
      <Link href="/dashboard" className="mb-6 flex-shrink-0" aria-label="WrikeView home">
        <div className="w-9 h-9 bg-[#FFB020] rounded-lg flex items-center justify-center hover:bg-[#FFC040] transition-colors">
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
            <rect x="2" y="6" width="8" height="2" rx="1" fill="#0F0A00" />
            <rect x="2" y="10" width="12" height="2" rx="1" fill="#0F0A00" />
            <rect x="2" y="14" width="6" height="2" rx="1" fill="#0F0A00" />
          </svg>
        </div>
      </Link>

      {/* Nav items */}
      {NAV_ITEMS.map((item) => {
        const isActive =
          item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            title={item.label}
            className={cn(
              "w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-150",
              isActive
                ? "bg-ground-3 text-[#FFB020]"
                : "text-[#5A6A94] hover:bg-ground-3 hover:text-[#EEF0FF]"
            )}
            aria-current={isActive ? "page" : undefined}
            aria-label={item.label}
          >
            {item.icon}
          </Link>
        );
      })}

      {/* Bottom: user avatar + sign out */}
      <div className="mt-auto flex flex-col items-center gap-3">
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          title="Sign out"
          className="w-11 h-11 rounded-xl flex items-center justify-center text-[#5A6A94] hover:bg-ground-3 hover:text-[#EEF0FF] transition-all duration-150"
          aria-label="Sign out"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>

        <Avatar
          name={name}
          imageUrl={session?.user?.image}
          size={32}
          className="cursor-default"
        />
      </div>
    </nav>
  );
}
