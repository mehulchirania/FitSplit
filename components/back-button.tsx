"use client";

import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "@/components/icons";

export function BackButton() {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === "/") {
    return null;
  }

  return (
    <div className="back-row">
      <button
        aria-label="Go back"
        className="button button-secondary back-button"
        onClick={() => router.back()}
        type="button"
      >
        <ArrowLeft />
        <span>Back</span>
      </button>
    </div>
  );
}
