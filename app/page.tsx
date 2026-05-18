import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LandingPageClient } from "@/components/landing-page-client";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getCurrentUser();
  if (user?.role === "admin") redirect("/admin");
  if (user?.role === "owner") redirect("/owner");
  if (user?.role === "member") redirect("/member");
  return <LandingPageClient />;
}
