"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState, useRef, useEffect, useTransition } from "react";
import { logoutUser } from "@/lib/auth";

/**
 * The one member sidebar, used by the dashboard shell and every /member sub-page.
 * Dashboard screens live on /member?screen=…; the rest are real routes.
 */

export const MEMBER_SCREENS = ["overview", "workout", "logs", "progress", "macros"] as const;
export type MemberScreen = (typeof MEMBER_SCREENS)[number];

const SCREEN_ITEMS: Array<{ screen: MemberScreen; label: string; icon: React.ReactNode }> = [
  { screen: "overview", label: "Overview", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l9-7 9 7v9a2 2 0 01-2 2h-3v-7H10v7H7a2 2 0 01-2-2v-9z"/></svg> },
  { screen: "workout", label: "Workout", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M6.5 6.5l11 11"/><path d="M3 9l3-3 3 3-3 3z"/><path d="M15 15l3-3 3 3-3 3z"/><path d="M2 12.5l1.5-1.5"/><path d="M22 11.5l-1.5 1.5"/></svg> },
  { screen: "logs", label: "Logs", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 4h11l3 3v13a1 1 0 01-1 1H5a1 1 0 01-1-1V5a1 1 0 011-1z"/><path d="M8 9h7M8 13h7M8 17h4"/></svg> },
  { screen: "progress", label: "Progress", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
  { screen: "macros", label: "Macros", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s-7-4.5-9-9a5 5 0 019-3 5 5 0 019 3c-2 4.5-9 9-9 9z"/></svg> },
];

const LINKS = [
  { href: "/member/programs", label: "Programs", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg> },
  { href: "/member/exercises", label: "Exercises", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 5v14M18 5v14"/><line x1="6" y1="12" x2="18" y2="12"/><rect x="3" y="8" width="3" height="8" rx="1"/><rect x="18" y="8" width="3" height="8" rx="1"/></svg> },
  { href: "/member/settings", label: "Profile", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/></svg> },
];

export function MemberSidebar({ firstName }: { firstName: string }) {
  const pathname = usePathname();
  const current = useSearchParams().get("screen");
  const activeScreen = MEMBER_SCREENS.find((x) => x === current) ?? "overview";
  const [menuOpen, setMenuOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);
  const initials = firstName.charAt(0).toUpperCase();

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  const handleLogout = () => {
    setMenuOpen(false);
    startTransition(async () => {
      window.localStorage.removeItem("fitsplit-remember-me");
      await logoutUser();
    });
  };

  // A link item is "active" if its path matches the current pathname
  function isLinkActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <aside className="m3d-side">
      {/* Brand — click goes back to dashboard */}
      <Link href="/member" className="m3d-side__logo m3d-side__logo--btn" aria-label="Go to dashboard">
        <div className="m3d-side__logo-mark">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon-512.png" alt="FitSplit" width={52} height={52} className="m3d-logo-img" />
        </div>
        <div className="m3d-side__logo-text">
          <span className="m3d-side__logo-name">FitSplit</span>
        </div>
      </Link>

      <nav className="m3d-side__nav">
        {SCREEN_ITEMS.map((item) => {
          const href = item.screen === "overview" ? "/member" : `/member?screen=${item.screen}`;
          return (
            <Link
              key={item.screen}
              href={href}
              onClick={(e) => {
                // On the dashboard, swap screens without refetching the page's data.
                if (pathname !== "/member" || e.metaKey || e.ctrlKey) return;
                e.preventDefault();
                window.history.pushState(null, "", href);
              }}
              className={`m3d-side__item${pathname === "/member" && activeScreen === item.screen ? " m3d-side__item--on" : ""}`}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          );
        })}
        <div className="m3d-side__section-sep" />
        {LINKS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`m3d-side__item m3d-side__item--link${isLinkActive(item.href) ? " m3d-side__item--on" : ""}`}
          >
            {item.icon}
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Account footer */}
      <div className="m3d-side__user-footer" ref={menuRef}>
        {menuOpen && (
          <>
            <div className="m3d-user-menu__overlay" onClick={() => setMenuOpen(false)} />
            <div className="m3d-user-menu">
              <div className="m3d-user-menu__header">
                <span className="mcr-avatar mcr-avatar--sm">{initials}</span>
                <div>
                  <div className="m3d-user-menu__name">{firstName}</div>
                  <div className="m3d-user-menu__role">Free account</div>
                </div>
              </div>
              <div className="m3d-user-menu__divider" />
              <Link href="/member/settings" className="m3d-user-menu__item" onClick={() => setMenuOpen(false)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/></svg>
                Profile &amp; metrics
              </Link>
              <div className="m3d-user-menu__divider" />
              <button className="m3d-user-menu__item m3d-user-menu__item--danger" onClick={handleLogout} disabled={isPending} type="button">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                {isPending ? "Logging out…" : "Log out"}
              </button>
            </div>
          </>
        )}
        <button className="m3d-user-btn" onClick={() => setMenuOpen((p) => !p)} type="button">
          <span className="mcr-avatar mcr-avatar--sm">{initials}</span>
          <div className="m3d-user-btn__id">
            <strong>{firstName}</strong>
            <span>Free account</span>
          </div>
          <span className="m3d-user-btn__chevron">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
          </span>
        </button>
        <button className="m3d-user-out" onClick={handleLogout} type="button" aria-label="Log out" disabled={isPending}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        </button>
      </div>
    </aside>
  );
}
