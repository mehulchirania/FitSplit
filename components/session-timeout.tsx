"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { logoutUser } from "@/lib/auth";

const sessionStartKey = "fitsplit-session-start";
const twoHoursMs = 2 * 60 * 60 * 1000;

export function SessionTimeout({ isAuthenticated }: { isAuthenticated: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      window.localStorage.removeItem(sessionStartKey);
      return;
    }

    const now = Date.now();
    const existingStart = Number(window.localStorage.getItem(sessionStartKey) ?? now);
    const sessionStart = Number.isFinite(existingStart) ? existingStart : now;

    window.localStorage.setItem(sessionStartKey, String(sessionStart));

    const remaining = Math.max(0, twoHoursMs - (now - sessionStart));
    const timeoutId = window.setTimeout(async () => {
      window.localStorage.removeItem(sessionStartKey);
      await logoutUser();
      router.replace("/");
      router.refresh();
    }, remaining);

    return () => window.clearTimeout(timeoutId);
  }, [isAuthenticated, router]);

  return null;
}
