"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@/types/domain";

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
      {links.map((link) => (
        <Link key={link.href} href={link.href}>
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
