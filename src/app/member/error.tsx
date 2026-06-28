"use client";

import { useEffect } from "react";
import { AppStatusScreen } from "@/components/app-status-screen";

export default function MemberError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[MemberError]", error);
  }, [error]);

  return (
    <AppStatusScreen
      body={error.message ?? "Something went wrong. Your workout data is safe; please try again."}
      code="!"
      eyebrow="Member dashboard"
      primaryAction={{ label: "Try again", onClick: reset }}
      secondaryAction={{ label: "Go to dashboard", href: "/member" }}
      title="Could not load your dashboard"
    />
  );
}
