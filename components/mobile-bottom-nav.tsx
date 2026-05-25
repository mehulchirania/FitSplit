"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@/types/domain";
import { Activity, Calendar, Dumbbell, Mail, Settings, UserRound, UsersRound } from "@/components/icons";

function linksForRole(role: Role) {
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
      { href: "/owner", label: "Dashboard", icon: Dumbbell },
      { href: "/owner/members", label: "Members", icon: UsersRound },
      { href: "/owner/training", label: "Training", icon: Calendar },
      { href: "/owner/programs", label: "Programs", icon: Dumbbell },
      { href: "/profile", label: "Profile", icon: UserRound }
    ];
  }

  return [
    { href: "/member", label: "Workout", icon: Dumbbell },
    { href: "/member#history", label: "History", icon: Activity },
    { href: "/member/pt-history", label: "PT", icon: Calendar },
    { href: "/activity", label: "Feed", icon: Activity },
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
  if (!role) {
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
