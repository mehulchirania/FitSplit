"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ExercisesIcon, PlansIcon, ProfileIcon, TodayIcon } from "./icons";

const TABS = [
  { href: "/member", label: "Today", Icon: TodayIcon, match: (p: string) => p === "/member" },
  { href: "/member/programs", label: "Plans", Icon: PlansIcon, match: (p: string) => p.startsWith("/member/programs") },
  { href: "/member/exercises", label: "Exercises", Icon: ExercisesIcon, match: (p: string) => p.startsWith("/member/exercises") },
  {
    href: "/member/settings",
    label: "Profile",
    Icon: ProfileIcon,
    match: (p: string) => p.startsWith("/member/settings") || p.startsWith("/member/progress") || p.startsWith("/member/rehab")
  }
] as const;

export function TabBar() {
  const pathname = usePathname();
  return (
    <nav className="fs-tabbar" aria-label="Main">
      {TABS.map(({ href, label, Icon, match }) => {
        const active = match(pathname);
        return (
          <Link key={href} href={href} className="fs-tab" aria-current={active ? "page" : undefined}>
            <Icon size={26} />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
