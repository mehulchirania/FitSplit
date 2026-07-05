import { redirect } from "next/navigation";
import "./landing.css";
import { LandingPageClient } from "@/components/landing/landing-page-client";
import { getCurrentUser } from "@/lib/auth";
import type { Role } from "@/types/domain";

const roleHome: Record<Role, string> = {
  admin: "/admin",
  owner: "/owner",
  trainer: "/trainer",
  member: "/member"
};

export default async function Home() {
  const currentUser = await getCurrentUser();
  if (currentUser) {
    redirect(roleHome[currentUser.role]);
  }

  return <LandingPageClient />;
}
