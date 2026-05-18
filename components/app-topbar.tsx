"use client";

import { signOut } from "firebase/auth";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { MainNav } from "@/components/main-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { Bell, Menu, UserRound, X } from "@/components/icons";

import { logoutUser } from "@/lib/auth";
import { clearUserNotifications } from "@/lib/firebase/actions";
import { getFirebaseClientServices } from "@/lib/firebase/client";
import type { Notification, Role } from "@/types/domain";

export function AppTopbar({
  gymName,
  initials,
  notifications = [],
  role,
  unreadInboxCount = 0
}: {
  gymName?: string;
  initials?: string;
  notifications?: Notification[];
  role?: Role;
  unreadInboxCount?: number;
}) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isTopbarHidden, setIsTopbarHidden] = useState(false);
  const [visibleNotifications, setVisibleNotifications] = useState(
    notifications.filter((notification) => !notification.readAt)
  );
  const [isClearingNotifications, startNotificationTransition] = useTransition();
  const [isLoggingOut, startLogoutTransition] = useTransition();
  const notificationRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const lastScrollYRef = useRef(0);
  const pathname = usePathname();

  useEffect(() => {
    setIsDrawerOpen(false);
    setIsNotificationsOpen(false);
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
    function closeNotifications(event: MouseEvent) {
      if (!notificationRef.current?.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    }

    document.addEventListener("mousedown", closeNotifications);
    return () => document.removeEventListener("mousedown", closeNotifications);
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

      if (isDrawerOpen || isNotificationsOpen || isProfileOpen || currentScrollY < 48) {
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
  }, [isDrawerOpen, isNotificationsOpen, isProfileOpen]);

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

  function handleClearNotifications() {
    const ids = visibleNotifications.map((notification) => notification.id);
    setVisibleNotifications([]);
    startNotificationTransition(async () => {
      await clearUserNotifications(ids);
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
          <Link className="brand" href={role === "admin" ? "/admin" : role === "owner" ? "/owner" : role === "member" ? "/member" : "/"}>
            <span className="theme-logo brand-icon-wrap" aria-hidden="true">
              <img alt="" className="brand-icon theme-logo-dark" src="/fitsplit-logo-dark.png" />
              <img alt="" className="brand-icon theme-logo-light" src="/fitsplit-logo-light.png" />
            </span>
            <strong style={{ fontSize: "1.15rem", letterSpacing: "-0.01em" }}>FitSplit</strong>
          </Link>
        </div>

        <MainNav role={role} />

        <div className="topbar-actions">
          {role === "member" ? (
            <div className="notification-menu" ref={notificationRef}>
              <button
                aria-expanded={isNotificationsOpen}
                aria-label="Open notifications"
                className="icon-button neutral-icon-button notification-trigger"
                onClick={() => setIsNotificationsOpen((current) => !current)}
                type="button"
              >
                <Bell />
                {visibleNotifications.length > 0 ? (
                  <span className="notification-badge">{visibleNotifications.length}</span>
                ) : null}
              </button>
              {isNotificationsOpen ? (
                <div className="notification-dropdown">
                  <div className="notification-dropdown-header">
                    <div>
                      <p className="eyebrow">Notifications</p>
                      <h2>Training updates</h2>
                    </div>
                    <button
                      aria-label="Close notifications"
                      className="icon-button neutral-icon-button"
                      onClick={() => setIsNotificationsOpen(false)}
                      type="button"
                    >
                      <X />
                    </button>
                  </div>
                  {visibleNotifications.length > 0 ? (
                    <>
                      <div className="notification-dropdown-list">
                        {visibleNotifications.slice(0, 6).map((notification) => (
                          <article className="notification-dropdown-item" key={notification.id}>
                            <span className="notification-dot" />
                            <div>
                              <strong>{notification.title}</strong>
                              <p>{notification.body}</p>
                            </div>
                          </article>
                        ))}
                      </div>
                      <button
                        className="button button-secondary notification-clear-button"
                        disabled={isClearingNotifications}
                        onClick={handleClearNotifications}
                        type="button"
                      >
                        {isClearingNotifications ? "Clearing..." : "Clear notifications"}
                      </button>
                    </>
                  ) : (
                    <p className="notification-empty">No new training updates.</p>
                  )}
                </div>
              ) : null}
            </div>
          ) : null}
          <div className="profile-menu app-profile-menu" ref={profileRef}>
            <button
              aria-expanded={isProfileOpen}
              aria-label="Open profile menu"
              className="profile-trigger"
              onClick={() => setIsProfileOpen((current) => !current)}
              type="button"
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
                >
                  {isLoggingOut ? "Logging out..." : "Log Out"}
                </button>
              </div>
            ) : null}
            </div>
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
                {gymName && <span className="member-meta">{gymName}</span>}
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
              {role === "admin" && (
                <>
                  <Link href="/admin" onClick={() => setIsDrawerOpen(false)}>
                    Dashboard
                  </Link>
                  <Link href="/admin/gyms" onClick={() => setIsDrawerOpen(false)}>
                    Gyms
                  </Link>
                  <Link
                    href="/admin/inbox"
                    onClick={() => setIsDrawerOpen(false)}
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
                  >
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
                </>
              )}
              {role === "owner" && (
                <>
                  <Link href="/owner" onClick={() => setIsDrawerOpen(false)}>
                    Dashboard
                  </Link>
                  <Link href="/owner/members" onClick={() => setIsDrawerOpen(false)}>
                    Members
                  </Link>
                  <Link href="/owner/programs" onClick={() => setIsDrawerOpen(false)}>
                    Programs
                  </Link>
                  <Link href="/owner/exercises" onClick={() => setIsDrawerOpen(false)}>
                    Exercise Catalog
                  </Link>
                </>
              )}
              {role === "member" && (
                <Link href="/member" onClick={() => setIsDrawerOpen(false)}>
                  Today&apos;s Workout
                </Link>
              )}
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
