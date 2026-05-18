import Link from "next/link";
import type { Role } from "@/types/domain";
import { Activity, Dumbbell, Mail, Settings, UserRound, UsersRound } from "@/components/icons";

function linksForRole(role: Role) {
  if (role === "admin") {
    return [
      { href: "/admin", label: "Admin", icon: Settings },
      { href: "/admin/gyms", label: "Gyms", icon: UsersRound },
      { href: "/admin/inbox", label: "Inbox", icon: Mail },
      { href: "/activity", label: "Activity", icon: Activity },
      { href: "/profile", label: "Profile", icon: UserRound }
    ];
  }

  if (role === "owner") {
    return [
      { href: "/owner", label: "Home", icon: Dumbbell },
      { href: "/owner/members", label: "Members", icon: UsersRound },
      { href: "/owner/programs", label: "Plans", icon: Dumbbell },
      { href: "/activity", label: "Activity", icon: Activity },
      { href: "/profile", label: "Profile", icon: UserRound }
    ];
  }

  return [
    { href: "/member", label: "Workout", icon: Dumbbell },
    { href: "/activity", label: "Activity", icon: Activity },
    { href: "/profile", label: "Profile", icon: UserRound }
  ];
}

export function MobileBottomNav({ role }: { role?: Role }) {
  if (!role) {
    return null;
  }

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
      {linksForRole(role).map((item) => {
        const Icon = item.icon;
        return (
          <Link href={item.href} key={item.href}>
            <Icon />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
