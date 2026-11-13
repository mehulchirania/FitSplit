"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function MemberError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[MemberError]", error);
  }, [error]);

  return (
    <main className="fs fs-page fs-page--center">
      <h1 className="fs-title">Something went wrong</h1>
      <p className="fs-soft">Your workout data is safe. Try again, or head back to Today.</p>
      <div className="fs-stack">
        <button type="button" className="fs-btn fs-btn--primary fs-btn--lg" onClick={reset}>
          Try again
        </button>
        <Link href="/member" className="fs-btn fs-btn--secondary fs-btn--lg">
          Go to Today
        </Link>
      </div>
    </main>
  );
}
