import { redirect } from "next/navigation";
import "./landing.css";
import { LandingPageClient } from "@/components/landing/landing-page-client";
import { getCurrentUser } from "@/lib/auth";

export default async function Home() {
  const currentUser = await getCurrentUser();
  if (currentUser) {
    redirect("/member");
  }

  return <LandingPageClient />;
}
