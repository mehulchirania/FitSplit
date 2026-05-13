"use client";

import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "@/components/icons";
import type { Role } from "@/types/domain";

const roleHomes: Record<Role, string> = {
  admin: "/admin",
  member: "/member",
  owner: "/owner"
};

function getParentPath(pathname: string, role?: Role) {
  if (!role) {
    return "/";
  }

  const roleHome = roleHomes[role];

  if (pathname === roleHome) {
    return null;
  }

  if (pathname.startsWith("/owner/members/")) {
    return "/owner/members";
  }

  if (pathname.startsWith("/admin/gyms/")) {
    return "/admin/gyms";
  }

  return roleHome;
}

export function BackButton({ role }: { role?: Role }) {
  const pathname = usePathname();
  const router = useRouter();
  const parentPath = getParentPath(pathname, role);

  if (pathname === "/" || !parentPath) {
    return null;
  }

  return (
    <div className="back-row">
      <button
        aria-label="Go back"
        className="button button-secondary back-button"
        onClick={() => router.push(parentPath)}
        type="button"
      >
        <ArrowLeft />
        <span>Back</span>
      </button>
    </div>
  );
}
