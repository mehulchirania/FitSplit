/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserRound } from "@/components/icons";
import { logoutUser } from "@/lib/auth";

/**
 * Slim top bar for signed-in pages outside the workout app (profile, legal
 * pages). The workout app under /member renders its own full-screen shell.
 */
export function AppTopbar({
  initials,
  avatarUrl
}: {
  initials?: string;
  avatarUrl?: string;
}) {
  const [isTopbarHidden, setIsTopbarHidden] = useState(false);
  const [isLoggingOut, startLogoutTransition] = useTransition();
  const lastScrollYRef = useRef(0);
  const pathname = usePathname();

  useEffect(() => {
    lastScrollYRef.current = window.scrollY;

    function handleScroll() {
      const currentScrollY = window.scrollY;
      const delta = currentScrollY - lastScrollYRef.current;

      if (currentScrollY < 48) {
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
  }, []);

  // The landing page and the workout app have their own chrome.
  if (pathname === "/" || pathname.startsWith("/member")) {
    return null;
  }

  function handleLogout() {
    startLogoutTransition(async () => {
      window.localStorage.removeItem("fitsplit-session-start");
      window.localStorage.removeItem("fitsplit-remember-me");
      await logoutUser();
    });
  }

  return (
    <header className={`topbar ${isTopbarHidden ? "topbar-hidden" : ""}`}>
      <div className="topbar-left">
        <Link className="brand" href="/member">
          <span className="theme-logo brand-icon-wrap" aria-hidden="true">
            <img alt="" className="brand-icon theme-logo-dark" src="/new_logo.png" />
            <img alt="" className="brand-icon theme-logo-light" src="/new_logo.png" />
          </span>
          <strong className="brand-wordmark">FitSplit</strong>
        </Link>
      </div>

      <div className="topbar-actions">
        <ThemeToggle />

        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button aria-label="Open profile menu" className="profile-trigger" type="button">
              {avatarUrl ? (
                <img className="profile-trigger-avatar" src={avatarUrl} alt="" />
              ) : initials ? (
                initials
              ) : (
                <UserRound />
              )}
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content className="profile-dropdown" align="end" sideOffset={8}>
              <DropdownMenu.Item asChild>
                <Link href="/member">Workouts</Link>
              </DropdownMenu.Item>
              <DropdownMenu.Item asChild>
                <Link href="/profile">View Profile</Link>
              </DropdownMenu.Item>
              <DropdownMenu.Item asChild>
                <button disabled={isLoggingOut} onClick={handleLogout} type="button">
                  {isLoggingOut ? "Logging out..." : "Log Out"}
                </button>
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </header>
  );
}
