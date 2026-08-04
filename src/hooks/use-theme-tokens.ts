"use client";

import { useEffect, useRef } from "react";

/**
 * Resolves CSS custom-property token values (e.g. "--brand") from the
 * document root at runtime, for the handful of drawing surfaces that can't
 * take `var(...)` directly — canvas 2D `fillStyle`/`strokeStyle` calls.
 * Everything else (inline styles, SVG attributes) should reference the CSS
 * variable directly instead; this hook is only needed for canvas.
 *
 * The resolved values live in the returned ref (`.current`), not in React
 * state — read them from inside your draw loop / animation callback, not
 * during render. A MutationObserver watches `data-theme` on <html> (the
 * attribute the runtime theme switcher writes to) and re-resolves the
 * tokens whenever it changes, then invokes `onThemeChange` so the caller
 * can force an immediate redraw instead of waiting for the next animation
 * frame or user interaction to pick up the new palette.
 *
 * The observer is disconnected on unmount.
 */
export function useThemeTokens<T extends Record<string, string>>(
  tokenNames: T,
  onThemeChange?: () => void
) {
  const valuesRef = useRef<Record<keyof T, string>>(resolveTokens(tokenNames));

  useEffect(() => {
    valuesRef.current = resolveTokens(tokenNames);

    const observer = new MutationObserver((mutations) => {
      if (!mutations.some((m) => m.attributeName === "data-theme")) return;
      valuesRef.current = resolveTokens(tokenNames);
      onThemeChange?.();
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => observer.disconnect();
    // tokenNames/onThemeChange are expected to be stable (module-level
    // objects / useCallback-free plain functions); re-subscribing on every
    // render would churn the observer for no benefit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return valuesRef;
}

function resolveTokens<T extends Record<string, string>>(
  tokenNames: T
): Record<keyof T, string> {
  const styles =
    typeof window !== "undefined"
      ? getComputedStyle(document.documentElement)
      : null;

  const out = {} as Record<keyof T, string>;
  for (const key in tokenNames) {
    out[key] = styles ? styles.getPropertyValue(tokenNames[key]).trim() : "";
  }
  return out;
}
