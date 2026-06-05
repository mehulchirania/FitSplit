"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useTransition, useRef, useEffect } from "react";
import { logoutUser } from "@/lib/auth";

// ── Icons ────────────────────────────────────────────────────────────────────
const IC = {
  home: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11l9-7 9 7v9a2 2 0 01-2 2h-3v-6h-8v6H5a2 2 0 01-2-2z"/>
    </svg>
  ),
  building: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 22v-8h6v8"/><path d="M3 9h18"/>
    </svg>
  ),
  dumbbell: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 5v14M18 5v14"/><line x1="6" y1="12" x2="18" y2="12"/><rect x="3" y="8" width="3" height="8" rx="1"/><rect x="18" y="8" width="3" height="8" rx="1"/>
    </svg>
  ),
  exercises: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  ),
  mail: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2"/><polyline points="3 7 12 13 21 7"/>
    </svg>
  ),
  billing: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
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

export type AdminSidebarData = {
  adminName: string;
  adminInitials: string;
  inboxCount?: number;
};

export function AdminSidebar({ data }: { data: AdminSidebarData }) {
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

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  }

  const NAV = [
    { href: "/admin",          label: "Overview",         icon: IC.home,      badge: 0 },
    { href: "/admin/gyms",     label: "Gyms",              icon: IC.building,  badge: 0 },
    { href: "/admin/programs", label: "Programs",          icon: IC.dumbbell,  badge: 0 },
    { href: "/admin/exercises",label: "Exercises",         icon: IC.exercises, badge: 0 },
    { href: "/admin/inbox",    label: "Inbox",             icon: IC.mail,      badge: data.inboxCount ?? 0 },
    { href: "/admin/billing",  label: "Platform billing",  icon: IC.billing,   badge: 0 },
  ];

  return (
    <aside className="odp2-sidebar">
      {/* Brand — FitSplit only (no gym co-brand for admin) */}
      <Link href="/admin" className="odp2-sidebar__brand" style={{ textDecoration: "none" }}>
        <div className="odp2-sidebar__logo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon-512.png" alt="FitSplit" width={38} height={38} style={{ borderRadius: 11, display: "block" }} />
        </div>
        <div>
          <div className="odp2-sidebar__gym-name">FitSplit</div>
          <div className="odp2-sidebar__gym-sub">Admin Console</div>
        </div>
      </Link>

      {/* Navigation */}
      <nav className="odp2-sidebar__nav">
        <div className="odp2-nav-section">
          <span className="odp2-nav-section-label">Platform</span>
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`odp2-nav-link${isActive(item.href) ? " odp2-nav-link--active" : ""}`}
            >
              <span className="odp2-nav-link-icon">{item.icon}</span>
              {item.label}
              {item.badge > 0 && (
                <span className="odp2-nav-badge odp2-nav-badge--alert">{item.badge > 99 ? "99+" : item.badge}</span>
              )}
            </Link>
          ))}
        </div>
      </nav>

      {/* ── Snowflake-style profile footer ── */}
      <div className="odp2-sidebar__user-footer" ref={menuRef}>
        {menuOpen && (
          <>
            <div className="odp2-user-menu__overlay" onClick={() => setMenuOpen(false)} />
            <div className="odp2-user-menu">
              <div className="odp2-user-menu__header">
                <span className="odp2-user-menu__avatar">{data.adminInitials}</span>
                <div>
                  <div className="odp2-user-menu__name">{data.adminName}</div>
                  <div className="odp2-user-menu__role">Super Admin</div>
                </div>
              </div>
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

        <button
          className="odp2-user-btn"
          type="button"
          onClick={() => setMenuOpen((p) => !p)}
          aria-label="Account menu"
        >
          <span className="odp2-user-btn__avatar">{data.adminInitials}</span>
          <div className="odp2-user-btn__id">
            <strong>{data.adminName}</strong>
            <span>Super Admin</span>
          </div>
          <span className="odp2-user-btn__chevron" style={{ opacity: 0.45 }}>{IC.chevD}</span>
        </button>

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
