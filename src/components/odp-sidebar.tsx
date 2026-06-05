"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useTransition, useRef, useEffect } from "react";
import { logoutUser } from "@/lib/auth";

// ── Icons ────────────────────────────────────────────────────────────────────
const IC = {
  today: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  people: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  money: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
  ),
  ops: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  ),
  dumbbell: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 5v14M18 5v14"/><line x1="6" y1="12" x2="18" y2="12"/><rect x="3" y="8" width="3" height="8" rx="1"/><rect x="18" y="8" width="3" height="8" rx="1"/>
    </svg>
  ),
  chart: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  ),
  payment: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
    </svg>
  ),
  user: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  settings: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
  bell: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  ),
  chevD: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  ),
  logout: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
};

export type OdpSidebarData = {
  gymName: string;
  gymLogoUrl?: string | null;
  ownerFirstName: string;
  ownerInitials: string;
  role: string;
  totalMembers: number;
  pendingPaymentsCount: number;
  noPlanCount: number;
};

export function OdpSidebar({ data }: { data: OdpSidebarData }) {
  const pathname = usePathname();

  const [menuOpen, setMenuOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  const handleLogout = () => {
    setMenuOpen(false);
    startTransition(() => { logoutUser(); });
  };

  // Match helpers — treat /owner exactly as dashboard, sub-paths as their own
  function isActive(href: string) {
    if (href === "/owner") return pathname === "/owner";
    return pathname.startsWith(href);
  }

  const NAV_MAIN = [
    { href: "/owner",          label: "Dashboard",  icon: IC.today,    badge: 0 },
    { href: "/owner/members",  label: "Members",    icon: IC.people,   badge: data.totalMembers },
    { href: "/owner/training", label: "Training",   icon: IC.ops,      badge: 0 },
    { href: "/owner/programs", label: "Programs",   icon: IC.dumbbell, badge: 0 },
    { href: "/owner/billing",  label: "Billing",    icon: IC.payment,  badge: data.pendingPaymentsCount },
    { href: "/owner/reports",  label: "Reports",    icon: IC.chart,    badge: 0 },
  ];

  const NAV_SETTINGS = [
    { href: "/owner/packages",  label: "Packages" },
    { href: "/owner/exercises", label: "Exercise catalog" },
    { href: "/owner/trainers",  label: "Trainers" },
    { href: "/owner/settings",  label: "Gym profile" },
  ];

  const roleLabel = data.role === "admin" ? "Super Admin" : "Owner";

  return (
    <aside className="odp2-sidebar">
      {/* Brand — FitSplit × gym co-brand */}
      <Link href="/owner" className="odp2-sidebar__brand" style={{ textDecoration: "none" }}>
        {data.gymLogoUrl ? (
          <div className="odp2-sidebar__cobrand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon-512.png" alt="FitSplit" className="odp2-sidebar__cobrand-logo" />
            <span className="odp2-sidebar__cobrand-sep">×</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={data.gymLogoUrl} alt={data.gymName} className="odp2-sidebar__cobrand-logo" />
          </div>
        ) : (
          <div className="odp2-sidebar__logo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon-512.png" alt="FitSplit" width={38} height={38} style={{ borderRadius: 10, display: "block" }} />
          </div>
        )}
        <div>
          <div className="odp2-sidebar__gym-name">FitSplit</div>
          <div className="odp2-sidebar__gym-sub">{data.gymName}</div>
        </div>
      </Link>

      {/* Navigation — scrollable */}
      <nav className="odp2-sidebar__nav">
        <div className="odp2-nav-section">
          <span className="odp2-nav-section-label">Manage</span>
          {NAV_MAIN.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`odp2-nav-link${isActive(item.href) ? " odp2-nav-link--active" : ""}`}
            >
              <span className="odp2-nav-link-icon">{item.icon}</span>
              {item.label}
              {item.badge > 0 && (
                <span className="odp2-nav-badge">{item.badge > 999 ? "999+" : item.badge}</span>
              )}
            </Link>
          ))}
        </div>

        <div className="odp2-nav-section">
          <span className="odp2-nav-section-label">Configure</span>
          {NAV_SETTINGS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`odp2-nav-link${isActive(item.href) ? " odp2-nav-link--active" : ""}`}
            >
              <span className="odp2-nav-link-icon">{IC.settings}</span>
              {item.label}
            </Link>
          ))}
        </div>
      </nav>

      {/* ── Snowflake-style profile footer ── */}
      <div className="odp2-sidebar__user-footer" ref={menuRef}>
        {/* Popup menu — renders above footer */}
        {menuOpen && (
          <>
            <div className="odp2-user-menu__overlay" onClick={() => setMenuOpen(false)} />
            <div className="odp2-user-menu">
              <div className="odp2-user-menu__header">
                <span className="odp2-user-menu__avatar">{data.ownerInitials}</span>
                <div>
                  <div className="odp2-user-menu__name">{data.ownerFirstName}</div>
                  <div className="odp2-user-menu__role">{roleLabel}</div>
                </div>
              </div>
              <div className="odp2-user-menu__divider" />
              <Link href="/owner/settings" className="odp2-user-menu__item" onClick={() => setMenuOpen(false)}>
                <span className="odp2-user-menu__item-icon">{IC.settings}</span>
                Gym settings
              </Link>
              <Link href="/owner/notifications" className="odp2-user-menu__item" onClick={() => setMenuOpen(false)}>
                <span className="odp2-user-menu__item-icon">{IC.bell}</span>
                Notifications
              </Link>
              <div className="odp2-user-menu__divider" />
              <button
                className="odp2-user-menu__item odp2-user-menu__item--danger"
                onClick={handleLogout}
                disabled={isPending}
                type="button"
              >
                <span className="odp2-user-menu__item-icon">{IC.logout}</span>
                {isPending ? "Logging out…" : "Log out"}
              </button>
            </div>
          </>
        )}

        {/* Main trigger button */}
        <button
          className="odp2-user-btn"
          type="button"
          onClick={() => setMenuOpen((p) => !p)}
          aria-label="Account menu"
        >
          <span className="odp2-user-btn__avatar">{data.ownerInitials}</span>
          <div className="odp2-user-btn__id">
            <strong>{data.ownerFirstName}</strong>
            <span>{roleLabel}</span>
          </div>
          <span className="odp2-user-btn__chevron" style={{ opacity: 0.45 }}>{IC.chevD}</span>
        </button>

        {/* Separate logout button */}
        <button
          className="odp2-user-out"
          type="button"
          title="Log out"
          onClick={handleLogout}
          disabled={isPending}
        >
          {IC.logout}
        </button>
      </div>
    </aside>
  );
}
