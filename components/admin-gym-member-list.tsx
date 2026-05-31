"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { callToggleMemberAccess, callResetMemberPin } from "@/lib/firebase/functions";
import { toggleMemberAccess, resetPassword } from "@/lib/firebase/actions";
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

// ── Inline edit panel for one member ─────────────────────────────────────────
function MemberPanel({ m, gymId, onClose }: { m: Member; gymId: string; onClose: () => void }) {
  const router = useRouter();
  const [active, setActive]   = useState(m.isActive);
  const [msg,    setMsg]      = useState<{ ok: boolean; text: string } | null>(null);
  const [isPending, startT]   = useTransition();

  function toast(ok: boolean, text: string) { setMsg({ ok, text }); setTimeout(() => setMsg(null), 3000); }

  function toggleAccess() {
    const next = !active; const prev = active;
    setActive(next);
    startT(async () => {
      try {
        const r = await callToggleMemberAccess({ memberId: m.id, isActive: next });
        toast(true, r.data.message);
        router.refresh();
      } catch {
        const fd = new FormData();
        fd.set("memberId", m.id); fd.set("isActive", String(next));
        const r = await toggleMemberAccess(initialFormActionState, fd);
        if (r.status === "error") setActive(prev);
        toast(r.status === "success", r.message);
        if (r.status === "success") router.refresh();
      }
    });
  }

  function resetPin() {
    startT(async () => {
      try {
        const r = await callResetMemberPin({ memberId: m.id, pin: "1234" });
        toast(true, r.data.message + " — new PIN: 1234");
      } catch {
        const fd = new FormData(); fd.set("memberId", m.id); fd.set("newPin", "1234");
        const r = await resetPassword(initialFormActionState, fd);
        toast(r.status === "success", r.message);
      }
    });
  }

  const msColor = m.membershipStatus === "expired" ? "var(--danger)"
    : m.membershipStatus === "expiring_soon" ? "#D97706"
    : "var(--brand)";

  return (
    <div style={{
      gridColumn: "1 / -1",
      padding: "14px 16px",
      background: "var(--bg-subtle)",
      borderTop: "1px solid var(--border)",
      borderBottom: "1px solid var(--border)",
      display: "grid",
      gridTemplateColumns: "1fr 1fr 1fr",
      gap: 12,
    }}>
      {/* Column 1 — Identity */}
      <div>
        <p style={{ fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--text-faint)", margin: "0 0 8px" }}>Identity</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {[
            ["Phone",    m.phone   || "—"],
            ["Email",    m.email   || "—"],
            ["Username", m.username ? `@${m.username}` : "—"],
            ["Joined",   fmt(m.joinedAt)],
            ["Goal",     m.goal    || "—"],
            ["Age",      m.age     ? `${m.age} yrs` : "—"],
          ].map(([label, value]) => (
            <div key={label} style={{ display: "flex", gap: 6, fontSize: 12 }}>
              <span style={{ color: "var(--text-faint)", fontWeight: 600, minWidth: 68 }}>{label}</span>
              <span style={{ color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Column 2 — Membership */}
      <div>
        <p style={{ fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--text-faint)", margin: "0 0 8px" }}>Membership</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {[
            ["Package",  m.currentPackageName || "—"],
            ["Status",   m.membershipStatus   || "—"],
            ["Expires",  m.membershipEndDate   ? fmt(m.membershipEndDate) : "—"],
            ["Weight",   m.weightKg   ? `${m.weightKg} kg` : "—"],
            ["Height",   m.heightCm   ? `${m.heightCm} cm` : "—"],
          ].map(([label, value]) => (
            <div key={label} style={{ display: "flex", gap: 6, fontSize: 12 }}>
              <span style={{ color: "var(--text-faint)", fontWeight: 600, minWidth: 68 }}>{label}</span>
              <span style={{ color: label === "Status" ? msColor : "var(--text)", fontWeight: label === "Status" ? 700 : 400 }}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Column 3 — Actions */}
      <div>
        <p style={{ fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--text-faint)", margin: "0 0 8px" }}>Actions</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          <button
            type="button"
            disabled={isPending}
            onClick={toggleAccess}
            style={{
              padding: "7px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700,
              cursor: "pointer", fontFamily: "inherit", width: "100%", textAlign: "left",
              background: active ? "var(--danger-soft)" : "var(--brand-soft)",
              color: active ? "var(--danger)" : "var(--brand)",
              border: `1px solid ${active ? "color-mix(in srgb, var(--danger) 25%, transparent)" : "color-mix(in srgb, var(--brand) 25%, transparent)"}`,
            }}
          >
            {isPending ? "Working…" : active ? "Suspend access" : "Restore access"}
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={resetPin}
            style={{
              padding: "7px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700,
              cursor: "pointer", fontFamily: "inherit", width: "100%", textAlign: "left",
              background: "var(--bg-elevated)",
              color: "var(--text-soft)",
              border: "1px solid var(--border)",
            }}
          >
            Reset PIN to 1234
          </button>
        </div>
        {msg && (
          <p style={{ marginTop: 8, fontSize: 11.5, fontWeight: 600, color: msg.ok ? "var(--brand)" : "var(--danger)" }}>
            {msg.text}
          </p>
        )}
      </div>
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
    <div style={{ maxHeight: 440, overflowY: "auto" }}>
      {members.length === 0 && (
        <div className="adm-empty">No members joined this gym yet.</div>
      )}
      {members.map((m, i) => (
        <div key={m.id}>
          {/* Member row — click to expand */}
          <button
            type="button"
            onClick={() => setExpanded(e => e === m.id ? null : m.id)}
            style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "11px 16px", width: "100%",
              background: expanded === m.id ? "var(--bg-subtle)" : "transparent",
              border: "none", borderBottom: i < members.length - 1 || expanded === m.id ? "1px solid var(--border)" : "none",
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
                {m.fullName}
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
              <svg
                width="12" height="12" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                style={{ color: "var(--text-faint)", transform: expanded === m.id ? "rotate(180deg)" : "none", transition: "transform 150ms" }}
              >
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>
          </button>

          {/* Inline panel */}
          {expanded === m.id && (
            <MemberPanel m={m} gymId={gymId} onClose={() => setExpanded(null)} />
          )}
        </div>
      ))}
    </div>
  );
}
