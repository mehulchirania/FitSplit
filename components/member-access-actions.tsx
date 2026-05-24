"use client";

import { useEffect, useState, useTransition } from "react";
import { resetPassword, toggleMemberAccess } from "@/lib/firebase/actions";
import { callResetMemberPin, callToggleMemberAccess } from "@/lib/firebase/functions";
import { Activity } from "@/components/icons";
import { initialFormActionState } from "@/types/action-state";

export function MemberAccessActions({
  isActive,
  memberId,
  username
}: {
  isActive: boolean;
  memberId: string;
  username?: string;
}) {
  const [active, setActive] = useState(isActive);
  const [pin, setPin] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setActive(isActive);
  }, [isActive]);

  function updateAccess() {
    const next = !active;
    const previous = active;
    setActive(next);
    setMessage(null);

    startTransition(async () => {
      try {
        const result = await callToggleMemberAccess({ memberId, isActive: next });
        setMessage({ type: "success", text: result.data.message });
      } catch {
        const fd = new FormData();
        fd.set("memberId", memberId);
        fd.set("isActive", String(next));
        const result = await toggleMemberAccess(initialFormActionState, fd);
        if (result.status === "error") {
          setActive(previous);
        }
        setMessage({ type: result.status === "success" ? "success" : "error", text: result.message });
      }
    });
  }

  function resetPin() {
    if (!/^\d{4}$/.test(pin)) {
      setMessage({ type: "error", text: "Enter a valid 4-digit PIN." });
      return;
    }

    setMessage(null);
    startTransition(async () => {
      try {
        const result = await callResetMemberPin({ memberId, pin });
        setPin("");
        setMessage({ type: "success", text: result.data.message });
      } catch {
        const fd = new FormData();
        fd.set("userId", memberId);
        fd.set("newPin", pin);
        const result = await resetPassword(initialFormActionState, fd);
        if (result.status === "success") {
          setPin("");
        }
        setMessage({ type: result.status === "success" ? "success" : "error", text: result.message });
      }
    });
  }

  return (
    <section className="form-panel mpd-account-panel">
      <div className="panel-title">
        <div>
          <p className="eyebrow">Member login</p>
          <h2>
            <Activity /> Account access
          </h2>
          <p className="mpd-login-username">
            Username: <strong>{username ?? "Not set"}</strong>
          </p>
        </div>
        <span className={`status-pill ${active ? "status-active" : "status-inactive"}`}>
          {active ? "Enabled" : "Suspended"}
        </span>
      </div>

      <div className="mpd-account-section">
        <button
          aria-pressed={active}
          className={`access-toggle ${active ? "is-on" : "is-off"}`}
          disabled={isPending}
          onClick={updateAccess}
          type="button"
        >
          {isPending ? "Updating..." : active ? "Access enabled" : "Access suspended"}
        </button>
        <p className="mpd-section-hint">
          {active
            ? "Toggle only when this member should no longer access their workout app."
            : "Restore when this member should regain app access."}
        </p>
      </div>

      <div className="mpd-account-section">
        <p className="mpd-section-label">Reset login PIN</p>
        <label>
          <input
            inputMode="numeric"
            maxLength={4}
            onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 4))}
            pattern="\d{4}"
            placeholder="Enter new 4-digit PIN"
            value={pin}
          />
        </label>
        <button className="button button-secondary" disabled={isPending || pin.length !== 4} onClick={resetPin} type="button">
          {isPending ? "Resetting..." : "Reset PIN"}
        </button>
      </div>

      {message ? (
        <p className={`form-message form-message-${message.type}`} role={message.type === "error" ? "alert" : "status"}>
          {message.text}
        </p>
      ) : null}
    </section>
  );
}
