"use client";

import { useEffect, useRef } from "react";

const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

function IconSpark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z" />
    </svg>
  );
}

/** Lightweight dialog for individual-account CTAs — no backend, just sets expectations. */
export function ComingSoonModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    returnFocusRef.current = document.activeElement as HTMLElement | null;
    panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "Tab" && panelRef.current) {
        const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      returnFocusRef.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="lp-modal-overlay" onClick={onClose}>
      <div
        ref={panelRef}
        className="lp-modal lp-modal--sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lp-comingsoon-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="lp-modal__head">
          <span className="lp-comingsoon__icon">
            <IconSpark />
          </span>
          <button type="button" className="lp-modal__close" onClick={onClose} aria-label="Close dialog">
            ✕
          </button>
        </div>

        <h2 className="lp-modal__title" id="lp-comingsoon-title">
          Individual accounts are coming soon
        </h2>
        <p className="lp-modal__sub">
          We&apos;re finishing the solo training experience — proven splits, offline logging, and progress
          tracking for people training on their own. Free and Pro are both on the way.
        </p>

        <div className="lp-comingsoon__actions">
          <a className="lp-btn lp-btn--primary" href="#enquiry" onClick={onClose}>
            Tell us you&apos;re interested
          </a>
          <button type="button" className="lp-btn lp-btn--ghost" onClick={onClose}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
