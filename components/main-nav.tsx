"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const adminLinks = [
  { href: "/admin", label: "Admin" },
  { href: "/owner", label: "Owner Dashboard" },
  { href: "/owner/members", label: "Member Management" },
  { href: "/owner/programs", label: "Programs" },
  { href: "/owner/exercises", label: "Catalog" }
];

const ownerLinks = [
  { href: "/owner", label: "Owner Dashboard" },
  { href: "/owner/members", label: "Member Management" },
  { href: "/owner/programs", label: "Programs" },
  { href: "/owner/exercises", label: "Catalog" }
];

const memberLinks = [
  { href: "/member", label: "My Portal" }
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
