import { redirect } from "next/navigation";
import "./landing.css";
import { LandingPageClient } from "@/components/landing/landing-page-client";
import { MobileEntryGate } from "@/components/onboarding/mobile-entry-gate";
import { getCurrentUser } from "@/lib/auth";

export default async function Home() {
  const currentUser = await getCurrentUser();
  if (currentUser) {
    redirect("/member");
  }

  // MobileEntryGate renders LandingPageClient unchanged on first paint (server
  // and client match exactly) and only swaps to the onboarding carousel /
  // mobile sign-in after mount, once it can safely read viewport width and
  // localStorage. Desktop visitors never see anything different from today.
  return (
    <MobileEntryGate>
      <LandingPageClient />
    </MobileEntryGate>
  );
}
