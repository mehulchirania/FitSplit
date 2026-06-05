"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { updateMemberProfile } from "@/lib/firebase/actions";
import { initialFormActionState } from "@/types/action-state";
import type { Member } from "@/types/domain";

const INP: React.CSSProperties = {
  width: "100%", padding: "7px 10px", fontSize: 12.5,
  background: "var(--bg-elevated)", border: "1px solid var(--border)",
  borderRadius: 8, color: "var(--text)", fontFamily: "inherit",
  boxSizing: "border-box" as const,
};
const LBL: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const,
  letterSpacing: ".07em", color: "var(--text-faint)", display: "block", marginBottom: 3,
};

export function AdminMemberProfileForm({ member }: { member: Member }) {
  const router = useRouter();
  const [state, action, isPending] = useActionState(updateMemberProfile, initialFormActionState);

  function handleSuccess() {
    if (state.status === "success") router.refresh();
  }

  return (
    <form action={action} onSubmit={handleSuccess}>
      <input type="hidden" name="memberId" value={member.id} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={LBL}>Full name *</label>
          <input name="fullName" style={INP} defaultValue={member.fullName} required />
        </div>
        <div>
          <label style={LBL}>Username</label>
          <input name="username" style={INP} defaultValue={member.username ?? ""} placeholder="e.g. john_doe" />
        </div>
        <div>
          <label style={LBL}>Email *</label>
          <input name="email" type="email" style={INP} defaultValue={member.email ?? ""} required />
        </div>
        <div>
          <label style={LBL}>Phone</label>
          <input name="phone" style={INP} defaultValue={member.phone ?? ""} placeholder="+91 98765 43210" />
        </div>
        <div>
          <label style={LBL}>Goal</label>
          <input name="goal" style={INP} defaultValue={member.goal ?? ""} placeholder="e.g. Build muscle" />
        </div>
      </div>

      {state.status !== "idle" && (
        <p style={{
          fontSize: 12, fontWeight: 600, marginBottom: 10,
          color: state.status === "success" ? "var(--brand)" : "var(--danger)",
        }}>
          {state.message}
        </p>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button type="submit" disabled={isPending} className="adm-btn adm-btn--sm"
          style={{ opacity: isPending ? 0.6 : 1 }}>
          {isPending ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
