"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { callToggleMemberAccess, callResetMemberPin } from "@/lib/firebase/functions";
import { toggleMemberAccess, resetPassword, updateMemberProfile } from "@/lib/firebase/actions";
import { initialFormActionState } from "@/types/action-state";
import type { Member } from "@/types/domain";

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(iso: string) {
  try { return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "2-digit" }).format(new Date(iso)); }
  catch { return iso; }
}
function avatarColor(id: string) {
  let n = 0;
  for (const c of id) n = ((n * 31) + c.charCodeAt(0)) & 0xfffff;
  const COLORS = ["var(--brand)","var(--accent)","#7C3AED","#D97706","var(--danger)","#0891B2"];
  return COLORS[n % COLORS.length];
}

// Shared input style
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

// ── Inline member panel ────────────────────────────────────────────────────────
function MemberPanel({ m, gymId }: { m: Member; gymId: string }) {
  const router = useRouter();

  // Tab: "details" or "access"
  const [tab, setTab] = useState<"details" | "access">("details");

  // Access toggle
  const [active, setActive] = useState(m.isActive);
  const [accMsg, setAccMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [accPending, startAccT] = useTransition();

  // Profile update via useActionState
  const [editState, editAction, editPending] = useActionState(updateMemberProfile, initialFormActionState);

  function toast(setter: typeof setAccMsg, ok: boolean, text: string) {
    setter({ ok, text }); setTimeout(() => setter(null), 3500);
  }

  function toggleAccess() {
    const next = !active; const prev = active;
    setActive(next);
    startAccT(async () => {
      try {
        const r = await callToggleMemberAccess({ memberId: m.id, isActive: next });
        toast(setAccMsg, true, r.data.message); router.refresh();
      } catch {
        const fd = new FormData();
        fd.set("memberId", m.id); fd.set("isActive", String(next));
        const r = await toggleMemberAccess(initialFormActionState, fd);
        if (r.status === "error") setActive(prev);
        toast(setAccMsg, r.status === "success", r.message);
        if (r.status === "success") router.refresh();
      }
    });
  }

  function resetPin() {
    startAccT(async () => {
      try {
        const r = await callResetMemberPin({ memberId: m.id, pin: "1234" });
        toast(setAccMsg, true, r.data.message + " — new PIN: 1234");
      } catch {
        const fd = new FormData(); fd.set("memberId", m.id); fd.set("newPin", "1234");
        const r = await resetPassword(initialFormActionState, fd);
        toast(setAccMsg, r.status === "success", r.message);
      }
    });
  }

  const msColor = m.membershipStatus === "expired" ? "var(--danger)"
    : m.membershipStatus === "expiring_soon" ? "#D97706"
    : "var(--brand)";

  // Tab button style
  const tabBtn = (t: "details" | "access"): React.CSSProperties => ({
    padding: "5px 14px", borderRadius: 7, fontSize: 11.5, fontWeight: 700,
    cursor: "pointer", fontFamily: "inherit", border: "none",
    background: tab === t ? "var(--bg-elevated)" : "transparent",
    color: tab === t ? "var(--text)" : "var(--text-faint)",
    boxShadow: tab === t ? "0 1px 4px rgba(0,0,0,0.12)" : "none",
  });

  return (
    <div style={{
      gridColumn: "1 / -1",
      background: "var(--bg-subtle)",
      borderTop: "1px solid var(--border)",
      borderBottom: "1px solid var(--border)",
    }}>
      {/* Tab switcher */}
      <div style={{
        display: "flex", gap: 4, padding: "8px 16px",
        background: "var(--bg-subtle)", borderBottom: "1px solid var(--border)",
      }}>
        <button type="button" style={tabBtn("details")} onClick={() => setTab("details")}>Edit member</button>
        <button type="button" style={tabBtn("access")}  onClick={() => setTab("access")}>Access &amp; membership</button>
      </div>

      {/* ── DETAILS TAB ── */}
      {tab === "details" && (
        <form action={editAction} style={{ padding: "14px 16px" }}>
          <input type="hidden" name="memberId" value={m.id} />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div>
              <label style={LBL}>Full name *</label>
              <input name="fullName" style={INP} defaultValue={m.fullName} required />
            </div>
            <div>
              <label style={LBL}>Username</label>
              <input name="username" style={INP} defaultValue={m.username ?? ""} placeholder="e.g. john_doe" />
            </div>
            <div>
              <label style={LBL}>Email *</label>
              <input name="email" type="email" style={INP} defaultValue={m.email ?? ""} required />
            </div>
            <div>
              <label style={LBL}>Phone</label>
              <input name="phone" style={INP} defaultValue={m.phone ?? ""} placeholder="+91 98765 43210" />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={LBL}>Goal</label>
              <input name="goal" style={INP} defaultValue={m.goal ?? ""} placeholder="e.g. Build muscle" />
            </div>
          </div>

          {/* Status message */}
          {editState.status !== "idle" && (
            <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 8,
              color: editState.status === "success" ? "var(--brand)" : "var(--danger)" }}>
              {editState.message}
            </p>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button type="submit" disabled={editPending}
              className="adm-btn adm-btn--sm"
              style={{ opacity: editPending ? 0.6 : 1 }}>
              {editPending ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      )}

      {/* ── ACCESS TAB ── */}
      {tab === "access" && (
        <div style={{ padding: "14px 16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

          {/* Membership info */}
          <div>
            <p style={{ ...LBL, marginBottom: 8 }}>Membership</p>
            {[
              ["Package",  m.currentPackageName || "—"],
              ["Status",   m.membershipStatus   || "No membership"],
              ["Expires",  m.membershipEndDate ? fmt(m.membershipEndDate) : "—"],
            ].map(([label, value]) => (
              <div key={label} style={{ display: "flex", gap: 8, fontSize: 12, marginBottom: 5 }}>
                <span style={{ color: "var(--text-faint)", fontWeight: 600, minWidth: 72 }}>{label}</span>
                <span style={{ color: label === "Status" ? msColor : "var(--text)", fontWeight: label === "Status" ? 700 : 400 }}>{value}</span>
              </div>
            ))}
          </div>

          {/* Access actions */}
          <div>
            <p style={{ ...LBL, marginBottom: 8 }}>Actions</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              <button type="button" disabled={accPending} onClick={toggleAccess}
                style={{
                  padding: "7px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700,
                  cursor: "pointer", fontFamily: "inherit", width: "100%", textAlign: "left",
                  background: active ? "var(--danger-soft)" : "var(--brand-soft)",
                  color: active ? "var(--danger)" : "var(--brand)",
                  border: `1px solid ${active ? "color-mix(in srgb, var(--danger) 25%, transparent)" : "color-mix(in srgb, var(--brand) 25%, transparent)"}`,
                }}>
                {accPending ? "Working…" : active ? "Suspend access" : "Restore access"}
              </button>
              <button type="button" disabled={accPending} onClick={resetPin}
                style={{
                  padding: "7px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700,
                  cursor: "pointer", fontFamily: "inherit", width: "100%", textAlign: "left",
                  background: "var(--bg-elevated)", color: "var(--text-soft)", border: "1px solid var(--border)",
                }}>
                Reset PIN to 1234
              </button>
            </div>
            {accMsg && (
              <p style={{ marginTop: 8, fontSize: 11.5, fontWeight: 600,
                color: accMsg.ok ? "var(--brand)" : "var(--danger)" }}>
                {accMsg.text}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main list ─────────────────────────────────────────────────────────────────
export function AdminGymMemberList({ members, gymId }: { members: Member[]; gymId: string }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  function initials(name: string) {
    const parts = name.trim().split(/\s+/);
    return (parts.length >= 2 ? parts[0][0] + parts[parts.length - 1][0] : name.slice(0, 2)).toUpperCase();
  }

  return (
    <div style={{ maxHeight: 520, overflowY: "auto" }}>
      {members.length === 0 && (
        <div className="adm-empty">No members joined this gym yet.</div>
      )}
      {members.map((m, i) => (
        <div key={m.id}>
          <button
            type="button"
            onClick={() => setExpanded(e => e === m.id ? null : m.id)}
            style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "11px 16px", width: "100%",
              background: expanded === m.id ? "var(--bg-subtle)" : "transparent",
              border: "none",
              borderBottom: i < members.length - 1 || expanded === m.id ? "1px solid var(--border)" : "none",
              cursor: "pointer", textAlign: "left", fontFamily: "inherit",
              transition: "background 80ms",
            }}
          >
            <span style={{
              width: 34, height: 34, borderRadius: 10, flexShrink: 0,
              background: avatarColor(m.id), color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 800,
            }}>
              {initials(m.fullName)}
            </span>
            <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", display: "flex", alignItems: "center", gap: 6 }}>
                <Link
                  href={`/admin/gyms/${gymId}/members/${m.id}`}
                  onClick={(e) => e.stopPropagation()}
                  style={{ color: "inherit", textDecoration: "none" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--brand)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "inherit"; }}
                >
                  {m.fullName}
                </Link>
                {m.username && <span style={{ fontSize: 11, fontWeight: 500, color: "var(--text-faint)" }}>@{m.username}</span>}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-soft)", marginTop: 1 }}>
                {m.phone || m.email || "No contact"}{m.goal ? ` · ${m.goal}` : ""}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 5,
                background: m.isActive ? "var(--brand-soft)" : "var(--bg-subtle)",
                color: m.isActive ? "var(--brand)" : "var(--text-soft)",
              }}>
                {m.isActive ? "ACTIVE" : "INACTIVE"}
              </span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                style={{ color: "var(--text-faint)", transform: expanded === m.id ? "rotate(180deg)" : "none", transition: "transform 150ms" }}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>
          </button>

          {expanded === m.id && <MemberPanel m={m} gymId={gymId} />}
        </div>
      ))}
    </div>
  );
}
