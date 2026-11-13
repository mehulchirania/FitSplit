"use client";

import { useRef } from "react";
import type { ClipboardEvent, KeyboardEvent, Ref } from "react";
import { PIN_LENGTH } from "@/lib/phone-identity";
import "./phone-pin-fields.css";

/**
 * Mobile-number and PIN inputs shared by sign-in, sign-up and Change PIN.
 * Both raise the numeric keypad (inputMode="numeric"). The PIN is four separate
 * masked boxes that advance on input, step back on Backspace and accept a paste.
 */

export function PhoneField({
  id,
  value,
  onChange,
  disabled,
  inputRef,
  autoFocus
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  inputRef?: Ref<HTMLInputElement>;
  autoFocus?: boolean;
}) {
  const international = value.trim().startsWith("+");
  return (
    <div className="phone-field">
      {!international && (
        <span className="phone-field__prefix" aria-hidden="true">
          +91
        </span>
      )}
      <input
        id={id}
        ref={inputRef}
        className="phone-field__input"
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        placeholder="98765 43210"
        maxLength={20}
        value={value}
        disabled={disabled}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value.replace(/[^\d+\s-]/g, ""))}
      />
    </div>
  );
}

export function PinField({
  label,
  value,
  onChange,
  disabled,
  invalid,
  firstBoxRef
}: {
  /** Accessible name of the whole group, e.g. "PIN" or "Confirm PIN". */
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  firstBoxRef?: Ref<HTMLInputElement>;
}) {
  const boxes = useRef<Array<HTMLInputElement | null>>([]);
  const focusBox = (index: number) => boxes.current[Math.max(0, Math.min(PIN_LENGTH - 1, index))]?.focus();

  function commit(next: string) {
    const clean = next.replace(/\D/g, "").slice(0, PIN_LENGTH);
    onChange(clean);
    return clean;
  }

  function handleInput(index: number, raw: string) {
    const typed = raw.replace(/\D/g, "");
    if (!typed) {
      commit(value.slice(0, index) + value.slice(index + 1));
      return;
    }
    // One character replaces just this box; several (autofill, fast paste) fill forward from it.
    const next = typed.length === 1 ? value.slice(0, index) + typed + value.slice(index + 1) : value.slice(0, index) + typed;
    const clean = commit(next);
    // Overwriting a filled box steps to the next one; otherwise follow the end of what is typed.
    focusBox(typed.length === 1 && index < value.length ? index + 1 : clean.length);
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !value[index] && index > 0) {
      e.preventDefault();
      commit(value.slice(0, index - 1));
      focusBox(index - 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      focusBox(index - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      focusBox(index + 1);
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "");
    if (!pasted) return;
    e.preventDefault();
    const clean = commit(pasted);
    focusBox(clean.length);
  }

  return (
    <div className="pin-field" role="group" aria-label={label}>
      {Array.from({ length: PIN_LENGTH }, (_, i) => (
        <input
          key={i}
          ref={(node) => {
            boxes.current[i] = node;
            if (i === 0 && firstBoxRef) {
              if (typeof firstBoxRef === "function") firstBoxRef(node);
              else (firstBoxRef as { current: HTMLInputElement | null }).current = node;
            }
          }}
          className="pin-field__box"
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          aria-label={`${label}, digit ${i + 1} of ${PIN_LENGTH}`}
          aria-invalid={invalid || undefined}
          value={value[i] ?? ""}
          disabled={disabled}
          onChange={(e) => handleInput(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.currentTarget.select()}
          onClick={() => {
            // Tapping past the end lands on the first empty box so digits always fill left to right.
            if (i > value.length) focusBox(value.length);
          }}
        />
      ))}
    </div>
  );
}
