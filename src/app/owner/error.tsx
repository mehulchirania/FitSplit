"use client";

import { useEffect } from "react";
import { AppStatusScreen } from "@/components/app-status-screen";

export default function OwnerError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[OwnerError]", error);
  }, [error]);

  return (
    <AppStatusScreen
      body={error.message ?? "Could not load this page. This may be a temporary issue."}
      code="!"
      eyebrow="Owner dashboard"
      primaryAction={{ label: "Try again", onClick: reset }}
      secondaryAction={{ label: "Back to dashboard", href: "/owner" }}
      title="Owner dashboard error"
    />
  );
}
