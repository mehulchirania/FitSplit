/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @next/next/no-img-element */
"use client";

import { signOut } from "firebase/auth";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { MainNav } from "@/components/main-nav";
import { Bell, Menu, UserRound, X } from "@/components/icons";

import { logoutUser } from "@/lib/auth";
import { clearUserNotifications } from "@/lib/firebase/actions";
import { getFirebaseClientServices } from "@/lib/firebase/client";
import type { Notification, Role } from "@/types/domain";

export function AppTopbar({
  gymName,
  gymLogoUrl,
  hasLiveSession = false,
  initials,
  notifications = [],
  role,
  staffType,
  unreadInboxCount = 0
}: {
  gymName?: string;
  gymLogoUrl?: string;
  hasLiveSession?: boolean;
  initials?: string;
  notifications?: Notification[];
  role?: Role;
  staffType?: string;
  unreadInboxCount?: number;
}) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isTopbarHidden, setIsTopbarHidden] = useState(false);
  const [visibleNotifications, setVisibleNotifications] = useState(
    notifications.filter((notification) => !notification.readAt)
  );
  const [isClearingNotifications, startNotificationTransition] = useTransition();
  const [isLoggingOut, startLogoutTransition] = useTransition();
  const lastScrollYRef = useRef(0);
  const pathname = usePathname();

  useEffect(() => {
    setIsDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    lastScrollYRef.current = window.scrollY;

    function handleScroll() {
      const currentScrollY = window.scrollY;
      const delta = currentScrollY - lastScrollYRef.current;

      if (isDrawerOpen || currentScrollY < 48) {
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
  }, [isDrawerOpen]);

  if (pathname === "/" || !role) {
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
          {/* ── Mobile nav drawer (Radix Dialog) ────────────────── */}
          <Dialog.Root open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
            <Dialog.Trigger asChild>
              <button
                aria-label="Open menu"
                className="icon-button neutral-icon-button"
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
            </Dialog.Trigger>

            <Dialog.Portal>
              <Dialog.Overlay className="drawer-backdrop" />
              <Dialog.Content
                aria-describedby={undefined}
                className="side-drawer"
              >
                <Dialog.Title className="sr-only">Navigation Menu</Dialog.Title>

                <div className="drawer-header">
                  <div>
                    <p className="eyebrow">Menu</p>
                    <h2>FitSplit</h2>
                    {gymName && <span className="member-meta">{gymName}</span>}
                  </div>
                  <Dialog.Close asChild>
                    <button
                      aria-label="Close menu"
                      className="button button-secondary"
                      type="button"
                    >
                      Close
                    </button>
                  </Dialog.Close>
                </div>

                <nav className="drawer-links" aria-label="Menu links">
                  {role === "admin" && (
                    <>
                      <Link href="/admin" onClick={() => setIsDrawerOpen(false)}>Dashboard</Link>
                      <Link href="/admin/gyms" onClick={() => setIsDrawerOpen(false)}>Gyms</Link>
                      <Link href="/admin/exercises" onClick={() => setIsDrawerOpen(false)}>Exercises</Link>
                      <Link href="/admin/programs" onClick={() => setIsDrawerOpen(false)}>Programs</Link>
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
                  {role === "owner" && staffType === "trainer" && (
                    <>
                      <Link href="/trainer" onClick={() => setIsDrawerOpen(false)}>My Schedule</Link>
                      <Link href="/owner/members" onClick={() => setIsDrawerOpen(false)}>Members</Link>
                      <Link href="/owner/training" onClick={() => setIsDrawerOpen(false)}>All PT Plans</Link>
                    </>
                  )}
                  {role === "owner" && staffType !== "trainer" && (
                    <>
                      <Link href="/owner" onClick={() => setIsDrawerOpen(false)}>Dashboard</Link>
                      <Link href="/owner/members" onClick={() => setIsDrawerOpen(false)}>Members</Link>
                      <Link href="/owner/training" onClick={() => setIsDrawerOpen(false)}>Training</Link>
                      <Link href="/owner/programs" onClick={() => setIsDrawerOpen(false)}>Programs</Link>
                      <Link href="/owner/exercises" onClick={() => setIsDrawerOpen(false)}>Exercise Catalog</Link>
                      <Link href="/owner/reports" onClick={() => setIsDrawerOpen(false)}>Reports</Link>
                    </>
                  )}
                  {role === "member" && (
                    <>
                      <Link href="/member" onClick={() => setIsDrawerOpen(false)}>Dashboard</Link>
                      <Link href="/member/programs" onClick={() => setIsDrawerOpen(false)}>Workout Programs</Link>
                      <Link href="/member#history" onClick={() => setIsDrawerOpen(false)}>Workout history</Link>
                      <Link href="/member/pt-history" onClick={() => setIsDrawerOpen(false)}>PT Plans</Link>
                      <Link href="/member/exercises" onClick={() => setIsDrawerOpen(false)}>Exercise Catalog</Link>
                      <Link href="/profile" onClick={() => setIsDrawerOpen(false)}>My Profile</Link>
                    </>
                  )}
                  <Link href="/about" onClick={() => setIsDrawerOpen(false)}>About</Link>
                </nav>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>

          <Link className="brand" href={role === "admin" ? "/admin" : role === "owner" ? "/owner" : role === "member" ? "/member" : "/"}>
            {gymLogoUrl && role !== "admin" ? (
              <span className="gym-brand-lockup" aria-label={`FitSplit x ${gymName ?? "gym"}`}>
                <span className="theme-logo brand-icon-wrap" aria-hidden="true">
                  <img alt="" className="brand-icon theme-logo-dark" src="/new_logo.png" />
                  <img alt="" className="brand-icon theme-logo-light" src="/new_logo.png" />
                </span>
                <span className="gym-brand-x" aria-hidden="true">x</span>
                <img alt={`${gymName ?? "Gym"} logo`} className="gym-brand-logo" src={gymLogoUrl} />
              </span>
            ) : (
              <span className="theme-logo brand-icon-wrap" aria-hidden="true">
                <img alt="" className="brand-icon theme-logo-dark" src="/new_logo.png" />
                <img alt="" className="brand-icon theme-logo-light" src="/new_logo.png" />
              </span>
            )}
            <strong className={gymLogoUrl && role !== "admin" ? "brand-wordmark brand-wordmark--with-gym" : "brand-wordmark"}>
              FitSplit
            </strong>
          </Link>
        </div>

        <MainNav role={role} staffType={staffType} />

        <div className="topbar-actions">
          {/* ── Notification bell — member & owner ───────────────── */}
          {(role === "member" || role === "owner") ? (
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  aria-label="Open notifications"
                  className="icon-button neutral-icon-button notification-trigger"
                  type="button"
                >
                  <Bell />
                  {visibleNotifications.length > 0 ? (
                    <span className="notification-red-dot" aria-hidden="true" />
                  ) : null}
                </button>
              </DropdownMenu.Trigger>

              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  className="notification-dropdown"
                  align="end"
                  sideOffset={8}
                >
                  <div className="notification-dropdown-header">
                    <div>
                      <p className="eyebrow">Notifications</p>
                      <h2>{role === "owner" ? "Gym updates" : "Training updates"}</h2>
                    </div>
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
                      <DropdownMenu.Item asChild>
                        <button
                          className="button button-secondary notification-clear-button"
                          disabled={isClearingNotifications}
                          onClick={handleClearNotifications}
                          type="button"
                        >
                          {isClearingNotifications ? "Clearing..." : "Clear notifications"}
                        </button>
                      </DropdownMenu.Item>
                    </>
                  ) : (
                    <p className="notification-empty">
                      {role === "owner" ? "No gym notifications." : "No new training updates."}
                    </p>
                  )}
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          ) : null}

          {/* ── Profile menu (Radix DropdownMenu) ────────────────── */}
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                aria-label="Open profile menu"
                className="profile-trigger"
                type="button"
              >
                {initials ? initials : <UserRound />}
                {/* Live session indicator — pulsing green dot */}
                {hasLiveSession && <span className="profile-trigger-live-dot" aria-hidden="true" />}
              </button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Portal>
              <DropdownMenu.Content
                className="profile-dropdown"
                align="end"
                sideOffset={8}
              >
                <DropdownMenu.Item asChild>
                  <Link href="/profile">View Profile</Link>
                </DropdownMenu.Item>
                {role === "owner" && (
                  <DropdownMenu.Item asChild>
                    <Link href="/owner/settings">Gym Settings</Link>
                  </DropdownMenu.Item>
                )}
                {role === "member" && (
                  <DropdownMenu.Item asChild>
                    <Link href="/member/pt-history">PT History</Link>
                  </DropdownMenu.Item>
                )}
                <DropdownMenu.Item asChild>
                  <button
                    disabled={isLoggingOut}
                    onClick={handleLogout}
                    type="button"
                  >
                    {isLoggingOut ? "Logging out..." : "Log Out"}
                  </button>
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </header>
    </>
  );
}
