"use client";

import { useEffect } from "react";
import { AppStatusScreen } from "@/components/app-status-screen";

export default function RootError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[RootError]", error);
  }, [error]);

  return (
    <AppStatusScreen
      body={error.message ?? "An unexpected error occurred. Please try again."}
      code="!"
      eyebrow="Application error"
      primaryAction={{ label: "Try again", onClick: reset }}
      secondaryAction={{ label: "Go home", href: "/" }}
      title="Something went wrong"
    />
  );
}
