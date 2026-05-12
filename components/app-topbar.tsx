"use client";

import { signOut } from "firebase/auth";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { MainNav } from "@/components/main-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { Menu, UserRound } from "@/components/icons";

import { logoutUser } from "@/lib/auth";
import { getFirebaseClientServices } from "@/lib/firebase/client";
import type { Role } from "@/types/domain";

export function AppTopbar({
  gymName,
  initials,
  role,
  unreadInboxCount = 0
}: {
  gymName?: string;
  initials?: string;
  role?: Role;
  unreadInboxCount?: number;
}) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isTopbarHidden, setIsTopbarHidden] = useState(false);
  const [isLoggingOut, startLogoutTransition] = useTransition();
  const profileRef = useRef<HTMLDivElement>(null);
  const lastScrollYRef = useRef(0);
  const pathname = usePathname();

  useEffect(() => {
    setIsDrawerOpen(false);
    setIsProfileOpen(false);
  }, [pathname]);

  useEffect(() => {
    function closeProfile(event: MouseEvent) {
      if (!profileRef.current?.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }

    document.addEventListener("mousedown", closeProfile);
    return () => document.removeEventListener("mousedown", closeProfile);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isDrawerOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isDrawerOpen]);

  useEffect(() => {
    lastScrollYRef.current = window.scrollY;

    function handleScroll() {
      const currentScrollY = window.scrollY;
      const delta = currentScrollY - lastScrollYRef.current;

      if (isDrawerOpen || isProfileOpen || currentScrollY < 48) {
        setIsTopbarHidden(false);
      } else if (delta > 8) {
        setIsTopbarHidden(true);
      } else if (delta < -8) {
        setIsTopbarHidden(false);
      }

      lastScrollYRef.current = currentScrollY;
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isDrawerOpen, isProfileOpen]);

  if (pathname === "/") {
    return null;
  }

  function handleLogout() {
    startLogoutTransition(async () => {
      try {
        const { auth } = getFirebaseClientServices();
        await signOut(auth);
      } catch {
        // The server logout below still clears the FitSplit session.
      }

      window.localStorage.removeItem("fitsplit-session-start");
      await logoutUser();
    });
  }

  return (
    <>
      <header className={`topbar ${isTopbarHidden ? "topbar-hidden" : ""}`}>
        <div className="topbar-left">
          <button
            aria-expanded={isDrawerOpen}
            aria-label="Open menu"
            className="icon-button neutral-icon-button"
            onClick={() => setIsDrawerOpen(true)}
            type="button"
            style={{ position: "relative" }}
          >
            <Menu />
            {unreadInboxCount > 0 && (
              <span style={{ 
                position: "absolute", 
                top: "6px", 
                right: "6px", 
                width: "10px", 
                height: "10px", 
                background: "var(--primary)", 
                borderRadius: "50%",
                border: "2px solid var(--bg-elevated)"
              }} />
            )}
          </button>
          <Link className="brand" href="/">
            <span className="brand-logo-lockup" aria-hidden="true">
              <span className="theme-logo brand-icon-wrap">
                <img alt="" className="brand-icon theme-logo-dark" src="/fitsplit-logo-dark.png" />
                <img alt="" className="brand-icon theme-logo-light" src="/fitsplit-logo-light.png" />
              </span>
              <span className="brand-x">x</span>
              <img alt="" className="partner-logo" src="/shg-gym-logo.jpeg" />
            </span>
            <span className="brand-text">
              <strong style={{ fontSize: "1.3rem" }}>FitSplit</strong>
              <small className="hide-mobile">x SHG Gym</small>
            </span>
          </Link>
        </div>

        <MainNav role={role} />

        <div className="profile-menu" ref={profileRef} style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "10px" }}>
          {gymName && (
            <span className="topbar-gym-name" style={{ fontSize: "0.84rem", color: "var(--text-soft)", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "200px" }}>{gymName}</span>
          )}
          <button
            aria-expanded={isProfileOpen}
            aria-label="Open profile menu"
            className="icon-button neutral-icon-button"
            onClick={() => setIsProfileOpen((current) => !current)}
            type="button"
            style={{ borderRadius: "50%", background: "var(--primary)", color: "var(--primary-foreground)", fontWeight: 600, fontSize: "1rem" }}
          >
            {initials ? initials : <UserRound />}
          </button>
          {isProfileOpen ? (
            <div className="profile-dropdown">
              <Link href="/profile" onClick={() => setIsProfileOpen(false)}>
                View Profile
              </Link>
              <button
                disabled={isLoggingOut}
                onClick={handleLogout}
                type="button"
                style={{ width: "100%", textAlign: "left", background: "none", border: "none", padding: 0, color: "var(--danger)", cursor: "pointer" }}
              >
                {isLoggingOut ? "Logging out..." : "Log Out"}
              </button>
            </div>
          ) : null}
        </div>
      </header>

      {isDrawerOpen ? (
        <div className="drawer-backdrop" onClick={() => setIsDrawerOpen(false)}>
          <aside
            aria-label="Application menu"
            className="side-drawer"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="drawer-header">
              <div>
                <p className="eyebrow">Menu</p>
                <h2>FitSplit</h2>
                <span className="member-meta">FitSplit x SHG Gym</span>
              </div>
              <button
                aria-label="Close menu"
                className="button button-secondary"
                onClick={() => setIsDrawerOpen(false)}
                type="button"
              >
                Close
              </button>
            </div>

            <div className="drawer-section">
              <span>Theme</span>
              <ThemeToggle />
            </div>

            <nav className="drawer-links" aria-label="Menu links">
              {role === "admin" || role === "owner" ? (
                <Link href="/owner" onClick={() => setIsDrawerOpen(false)}>
                  Owner Flow
                </Link>
              ) : null}
              {role === "admin" && (
                <Link href="/admin/inbox" onClick={() => setIsDrawerOpen(false)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>Inbox</span>
                  {unreadInboxCount > 0 && (
                    <span style={{ 
                      background: "var(--primary)", 
                      color: "var(--primary-foreground)", 
                      padding: "2px 8px", 
                      borderRadius: "99px", 
                      fontSize: "0.75rem",
                      fontWeight: 700
                    }}>{unreadInboxCount}</span>
                  )}
                </Link>
              )}
              {role === "member" ? (
                <Link href="/member" onClick={() => setIsDrawerOpen(false)}>
                  Member Today
                </Link>
              ) : null}
              <Link href="/activity" onClick={() => setIsDrawerOpen(false)}>
                Activity
              </Link>
              <Link href="/about" onClick={() => setIsDrawerOpen(false)}>
                About
              </Link>
            </nav>
          </aside>
        </div>
      ) : null}
    </>
  );
}
