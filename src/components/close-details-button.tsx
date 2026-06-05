"use client";

import { useRef } from "react";

/**
 * A button that closes the nearest ancestor <details> element when clicked.
 * Drop it anywhere inside a <details> to provide a "Cancel" / "Close" affordance
 * that is visually separate from the <summary> toggle.
 */
export function CloseDetailsButton({
  className = "button button-secondary",
  label = "Cancel",
}: {
  className?: string;
  label?: string;
}) {
  const ref = useRef<HTMLButtonElement>(null);

  function handleClick() {
    const details = ref.current?.closest<HTMLDetailsElement>("details");
    if (details) details.open = false;
  }

  return (
    <button className={className} onClick={handleClick} ref={ref} type="button">
      {label}
    </button>
  );
}
