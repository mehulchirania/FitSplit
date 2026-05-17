import { LandingPageClient } from "@/components/landing-page-client";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Home() {
  const currentUser = await getCurrentUser();

  if (currentUser?.role === "admin") {
    redirect("/admin");
  }

  if (currentUser?.role === "owner") {
    redirect("/owner");
  }

  if (currentUser?.role === "member") {
    redirect("/member");
  }

  return <LandingPageClient />;
}
