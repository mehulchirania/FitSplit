"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import type { FormEvent } from "react";
import { PhoneField, PinField } from "@/components/phone-pin-fields";
import { loginWithPin } from "@/lib/auth";
import { isValidPin, normalizePhone } from "@/lib/phone-identity";

const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

export function LoginModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [isPending, start] = useTransition();
  const panelRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    returnFocusRef.current = document.activeElement as HTMLElement | null;
    firstFieldRef.current?.focus();
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

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (!normalizePhone(phone)) {
      setError("Enter a valid 10-digit mobile number.");
      return;
    }
    if (!isValidPin(pin)) {
      setError("Enter your 4-digit PIN.");
      return;
    }

    start(async () => {
      try {
        const fd = new FormData();
        fd.set("phone", phone.trim());
        fd.set("pin", pin);
        const session = await loginWithPin(fd);
        if (session.status !== "success") {
          setError(session.message);
          setPin("");
          return;
        }
        window.scrollTo(0, 0);
        window.location.replace(session.redirectUrl);
      } catch (err) {
        console.error(err);
        setError("Unable to sign in. Please try again.");
      }
    });
  }

  if (!open) return null;

  return (
    <div className="lp-modal-overlay" onClick={onClose}>
      <div
        ref={panelRef}
        className="lp-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lp-login-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="lp-modal__head">
          <span className="lp-brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/new_logo.png" alt="FitSplit" style={{ height: 28 }} />
            <span style={{ fontSize: 16 }}>FitSplit</span>
          </span>
          <button type="button" className="lp-modal__close" onClick={onClose} aria-label="Close login dialog">
            ✕
          </button>
        </div>

        <h2 className="lp-modal__title" id="lp-login-title">
          Welcome back.
        </h2>
        <p className="lp-modal__sub">Sign in with your mobile number and 4-digit PIN.</p>

        <form className="lp-modal__form" onSubmit={onSubmit}>
          <div className="lp-field">
            <label htmlFor="lp-login-phone">Mobile number</label>
            <PhoneField id="lp-login-phone" inputRef={firstFieldRef} value={phone} onChange={setPhone} disabled={isPending} />
          </div>
          <div className="lp-field">
            <span className="lp-field__label">
              PIN
            </span>
            <PinField label="PIN" value={pin} onChange={setPin} disabled={isPending} invalid={Boolean(error)} />
          </div>

          {error && (
            <p className="lp-form__error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="lp-btn lp-btn--primary" disabled={isPending}>
            {isPending ? "Logging in…" : "Log in"}
          </button>
        </form>

        <p className="lp-modal__footnote">
          New here? <Link href="/signup">Create an account</Link>
        </p>
      </div>
    </div>
  );
}
