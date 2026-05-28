"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import type { OdpSidebarData } from "@/components/odp-sidebar";
import { OdpSidebar } from "@/components/odp-sidebar";

const IC_SEARCH = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);
const IC_BELL = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>
);
const IC_PLUS = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

const PAGE_LABELS: Record<string, string> = {
  "/owner":               "Dashboard",
  "/owner/members":       "Members",
  "/owner/training":      "Training",
  "/owner/programs":      "Workout Programs",
  "/owner/billing":       "Billing",
  "/owner/reports":       "Reports",
  "/owner/packages":      "Packages",
  "/owner/exercises":     "Exercise Catalog",
  "/owner/trainers":      "Trainers",
  "/owner/settings":      "Settings",
  "/owner/notifications": "Notifications",
};

function pageLabel(pathname: string): string {
  if (PAGE_LABELS[pathname]) return PAGE_LABELS[pathname];
  // member detail
  if (pathname.startsWith("/owner/members/")) return "Member";
  // training sub-pages
  if (pathname.startsWith("/owner/training/")) return "Training";
  return "Owner";
}

export function OdpWorkspaceShell({
  data,
  children,
}: {
  data: OdpSidebarData;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const title = pageLabel(pathname);

  return (
    <div className="odp2-workspace">
      <OdpSidebar data={data} />

      <div className="odp2-main">
        {/* Header bar — always visible */}
        <header className="odp2-header">
          <div className="odp2-header__crumb">
            <span className="odp2-header__gym">{data.gymName}</span>
            <span className="odp2-header__page">{title}</span>
          </div>
          <div className="odp2-header__spacer" />
          <div className="odp2-header__search">
            {IC_SEARCH}
            <span>Search members, payments…</span>
            <kbd>⌘K</kbd>
          </div>
          <button className="odp2-header__bell" aria-label="Notifications">
            {IC_BELL}
          </button>
          <Link href="/owner/members/new" className="odp2-header__add">
            {IC_PLUS} Add member
          </Link>
        </header>

        {/*
          Children render here directly inside odp2-main.
          - Dashboard (/owner): renders odp2-tabbar + odp2-scroll itself (tabs above scroll)
          - Sub-pages (/owner/members, etc.): wrap in odp2-scroll via their page
        */}
        {children}
      </div>
    </div>
  );
}
