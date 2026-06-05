"use client";

import { useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * Live-search input for the admin exercise catalog.
 * Debounces 200ms then updates the ?q= URL param without a full page reload.
 */
export function AdminExerciseSearch({
  initialValue,
  gymParam,
}: {
  initialValue: string;
  gymParam?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(initialValue);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    setValue(q);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (q) {
        params.set("q", q);
      } else {
        params.delete("q");
      }
      if (gymParam) params.set("gym", gymParam);
      router.replace(`/admin/exercises?${params.toString()}`, { scroll: false });
    }, 200);
  }

  function handleClear() {
    setValue("");
    if (timerRef.current) clearTimeout(timerRef.current);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("q");
    if (gymParam) params.set("gym", gymParam);
    router.replace(`/admin/exercises?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="adm-search" style={{ flex: 1, maxWidth: 340 }}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>
      </svg>
      <input
        aria-label="Search exercises"
        autoComplete="off"
        onChange={handleChange}
        placeholder="Search exercises…"
        style={{
          background: "transparent",
          border: "none",
          outline: "none",
          color: "var(--text)",
          fontSize: 12,
          flex: 1,
          minWidth: 0,
        }}
        type="search"
        value={value}
      />
      {value && (
        <button
          aria-label="Clear search"
          onClick={handleClear}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--text-faint)",
            padding: "0 2px",
            lineHeight: 1,
            fontSize: 14,
          }}
          type="button"
        >
          ✕
        </button>
      )}
    </div>
  );
}
