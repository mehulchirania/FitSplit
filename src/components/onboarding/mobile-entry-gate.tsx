"use client";

import { useEffect, useState, type ReactNode } from "react";
import { OnboardingCarousel } from "./onboarding-carousel";
import { MobileSignIn } from "./mobile-sign-in";

const ONBOARDED_KEY = "fitsplit.onboarded";

type Phase = "landing" | "carousel" | "signin";

// Decides, client-side only and after mount, whether an unauthenticated
// visitor sees the desktop landing page, the mobile onboarding carousel, or
// mobile sign-in directly. The initial render (server AND first client pass)
// always renders `children` (the existing landing page) unchanged, so there
// is no server/client markup mismatch — the branch only happens inside a
// useEffect, per the hydration-safety rule in docs/05_MOBILE_DESIGN_SPEC.md.
export function MobileEntryGate({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>("landing");

  useEffect(() => {
    try {
      const isMobile = window.matchMedia("(max-width: 768px)").matches;
      if (!isMobile) return;
      const onboarded = window.localStorage.getItem(ONBOARDED_KEY) === "1";
      setPhase(onboarded ? "signin" : "carousel");
    } catch {
      // localStorage unavailable (private mode, etc.) — fall back to landing.
    }
  }, []);

  function finishOnboarding() {
    try {
      window.localStorage.setItem(ONBOARDED_KEY, "1");
    } catch {
      // Ignore — worst case the carousel reappears next visit.
    }
    setPhase("signin");
  }

  if (phase === "carousel") {
    return <OnboardingCarousel onFinish={finishOnboarding} />;
  }

  if (phase === "signin") {
    return <MobileSignIn />;
  }

  return <>{children}</>;
}
