"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@/types/domain";

const adminLinks = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/gyms", label: "Gyms" },
  { href: "/admin/exercises", label: "Exercises" },
  { href: "/admin/programs", label: "Programs" },
  { href: "/admin/inbox", label: "Inbox" }
];

const ownerLinks = [
  { href: "/owner", label: "Dashboard" },
  { href: "/owner/members", label: "Members" },
  { href: "/owner/programs", label: "Workout Programs" },
  { href: "/owner/exercises", label: "Exercise Catalog" }
];

function isActiveLink(pathname: string, href: string) {
  // Exact match for the dashboard ("/admin", "/owner")
  // Prefix match (with trailing slash) for nested routes ("/admin/gyms/abc" matches "/admin/gyms")
  if (pathname === href) return true;
  return pathname.startsWith(href + "/");
}

export function MainNav({ role }: { role?: Role }) {
  const pathname = usePathname();

  if (!role || role === "member" || pathname.startsWith("/member") || pathname.startsWith("/profile") || pathname.startsWith("/activity")) {
    return null;
  }

  const links = role === "admin" || pathname.startsWith("/admin")
    ? adminLinks
    : ownerLinks;

  return (
    <nav className="topnav" aria-label="Primary navigation">
      {links.map((link) => {
        const active = isActiveLink(pathname, link.href);
        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={active ? "is-active" : ""}
            href={link.href}
            key={link.href}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
