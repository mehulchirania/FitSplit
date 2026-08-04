"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@/types/domain";
import { Calendar, Dumbbell, Mail, Settings, UserRound, UsersRound } from "@/components/icons";

// Members are excluded by the guard in MobileBottomNav below (and by the
// !role check for anonymous visitors), so this only ever runs for "admin",
// "owner", or "trainer" — there is no member link array to keep in sync.
function linksForRole(role: Exclude<Role, "member">) {
  if (role === "admin") {
    return [
      { href: "/admin", label: "Admin", icon: Settings },
      { href: "/admin/gyms", label: "Gyms", icon: UsersRound },
      { href: "/admin/exercises", label: "Exercises", icon: Dumbbell },
      { href: "/admin/inbox", label: "Inbox", icon: Mail },
      { href: "/profile", label: "Profile", icon: UserRound }
    ];
  }

  if (role === "owner") {
    return [
      { href: "/owner", label: "Dashboard", icon: Settings },
      { href: "/owner/members", label: "Members", icon: UsersRound },
      { href: "/owner/training", label: "Training", icon: Calendar },
      { href: "/owner/programs", label: "Programs", icon: Dumbbell },
      { href: "/profile", label: "Profile", icon: UserRound }
    ];
  }

  return [
    { href: "/trainer", label: "Schedule", icon: Calendar },
    { href: "/trainer/members", label: "Members", icon: UsersRound },
    { href: "/profile", label: "Profile", icon: UserRound }
  ];
}

function isActiveLink(pathname: string, href: string) {
  if (pathname === href) return true;
  // Match nested routes (e.g. /owner/members/abc highlights "Members")
  // BUT do NOT let a longer parent like "/owner" capture /owner/members
  // by only matching when there's a trailing slash after the prefix.
  return pathname.startsWith(href + "/");
}

export function MobileBottomNav({ role }: { role?: Role }) {
  const pathname = usePathname();
  // Members never see this bar (they have no link array for it — see
  // linksForRole). Owner and member workspaces also suppress it on their own
  // scoped routes (/owner/*, /member/*), which have full-screen in-shell
  // layouts with built-in navigation; this floating bar still appears for an
  // owner or trainer on a shared route outside those trees (e.g. /profile).
  // Suppressing at the component level (rather than only via CSS) avoids a
  // flash before any :has()-based hiding rule can apply.
  const inScopedWorkspace = pathname.startsWith("/owner") || pathname.startsWith("/member");
  if (!role || role === "member" || inScopedWorkspace) {
    return null;
  }

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
      {linksForRole(role).map((item) => {
        const Icon = item.icon;
        const active = isActiveLink(pathname, item.href);
        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={active ? "is-active" : ""}
            href={item.href}
            key={item.href}
          >
            <Icon />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
