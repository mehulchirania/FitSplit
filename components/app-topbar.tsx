"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { MainNav } from "@/components/main-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { Menu, UserRound } from "@/components/icons";

import { logoutUser } from "@/lib/auth";

export function AppTopbar({ initials, gymName }: { initials?: string; gymName?: string }) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
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
  if (pathname === "/") {
    return null;
  }

  return (
    <>
      <header className="topbar">
        <div className="topbar-left">
          <button
            aria-expanded={isDrawerOpen}
            aria-label="Open menu"
            className="icon-button neutral-icon-button"
            onClick={() => setIsDrawerOpen(true)}
            type="button"
          >
            <Menu />
          </button>
          <Link className="brand" href="/">
            <img
              alt="FitSplit"
              className="brand-icon"
              height="48"
              src="/icon-512.png"
              width="48"
              style={{ width: "48px", height: "48px" }}
            />
            <span>
              <strong style={{ fontSize: "1.3rem" }}>FitSplit</strong>
              <small>Your fitness companion</small>
            </span>
          </Link>
        </div>

        <MainNav />

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
              <form action={logoutUser}>
                <button type="submit" style={{ width: "100%", textAlign: "left", background: "none", border: "none", padding: 0, color: "var(--danger)", cursor: "pointer" }}>Log Out</button>
              </form>
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
                <span className="member-meta">Your fitness companion</span>
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
              <Link href="/owner" onClick={() => setIsDrawerOpen(false)}>
                Owner Flow
              </Link>
              <Link href="/member" onClick={() => setIsDrawerOpen(false)}>
                Member Today
              </Link>
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
