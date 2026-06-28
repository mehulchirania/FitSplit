"use client";

import { useEffect } from "react";
import { AppStatusScreen } from "@/components/app-status-screen";

export default function AdminError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[AdminError]", error);
  }, [error]);

  return (
    <AppStatusScreen
      body={error.message ?? "Could not load this page. Check your Firebase connection and try again."}
      code="!"
      eyebrow="Admin console"
      primaryAction={{ label: "Try again", onClick: reset }}
      secondaryAction={{ label: "Back to admin", href: "/admin" }}
      title="Admin console error"
    />
  );
}
