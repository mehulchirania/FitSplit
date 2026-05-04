"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BackButton } from "@/components/back-button";
import { MainNav } from "@/components/main-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { Menu, UserRound } from "@/components/icons";

export function AppTopbar() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

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
          <BackButton />
          <Link className="brand" href="/">
            <img
              alt="FitSplit"
              className="brand-icon"
              height="36"
              src="/icon-512.png"
              width="36"
            />
            <span>
              <strong>FitSplit</strong>
              <small>Your fitness companion</small>
            </span>
          </Link>
        </div>

        <MainNav />

        <div className="profile-menu" ref={profileRef}>
          <button
            aria-expanded={isProfileOpen}
            aria-label="Open profile menu"
            className="icon-button neutral-icon-button"
            onClick={() => setIsProfileOpen((current) => !current)}
            type="button"
          >
            <UserRound />
          </button>
          {isProfileOpen ? (
            <div className="profile-dropdown">
              <Link href="/profile" onClick={() => setIsProfileOpen(false)}>
                View Profile
              </Link>
              <button type="button">Log Out</button>
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
