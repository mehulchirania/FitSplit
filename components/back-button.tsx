"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "@/components/icons";

export function BackButton() {
  const router = useRouter();

  return (
    <button
      aria-label="Go back"
      className="icon-button neutral-icon-button"
      onClick={() => router.back()}
      type="button"
    >
      <ArrowLeft />
    </button>
  );
}
