"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const adminLinks = [
  { href: "/admin", label: "Admin" },
  { href: "/owner", label: "Dashboard" },
  { href: "/owner/members", label: "Members" },
  { href: "/owner/programs", label: "Workout Programs" },
  { href: "/owner/exercises", label: "Exercise Catalog" }
];

const ownerLinks = [
  { href: "/owner", label: "Dashboard" },
  { href: "/owner/members", label: "Members" },
  { href: "/owner/programs", label: "Workout Programs" },
  { href: "/owner/exercises", label: "Exercise Catalog" }
];

const memberLinks = [
  { href: "/member", label: "Today" },
  { href: "/profile", label: "Profile" },
  { href: "/activity?role=member", label: "Activity" }
];

export function MainNav() {
  const pathname = usePathname();
  const links = pathname.startsWith("/member")
    ? memberLinks
    : pathname.startsWith("/admin")
      ? adminLinks
      : ownerLinks;

  return (
    <nav className="topnav" aria-label="Primary navigation">
      {links.map((link) => (
        <Link key={link.href} href={link.href}>
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
