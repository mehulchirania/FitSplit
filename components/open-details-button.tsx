"use client";

import type { CSSProperties, ReactNode } from "react";

/**
 * A button/anchor that opens a <details> element by ID and scrolls to it.
 * Replaces bare <a href="#id"> links which do NOT auto-open collapsed <details>.
 */
export function OpenDetailsButton({
  targetId,
  children,
  className,
  style,
}: {
  targetId: string;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  function handleClick() {
    const el = document.getElementById(targetId);
    if (el instanceof HTMLDetailsElement) {
      el.open = true;
    }
    // Allow the default href="#id" scroll to proceed
  }

  return (
    <a href={`#${targetId}`} className={className} style={style} onClick={handleClick}>
      {children}
    </a>
  );
}
