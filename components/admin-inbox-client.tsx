"use client";

import { useState } from "react";
import type { ContactMessage } from "@/types/domain";

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  return d === 1 ? "yesterday" : `${d}d ago`;
}

// Infer thread "kind" from message body / context
function threadKind(msg: ContactMessage): { label: string; cls: string } {
  const body = msg.body.toLowerCase();
  if (body.includes("signup") || body.includes("new gym") || body.includes("register"))
    return { label: "NEW SIGNUP", cls: "adm-inbox-tag adm-inbox-tag--ok" };
  if (body.includes("feature") || body.includes("suggest") || body.includes("request"))
    return { label: "FEATURE REQ", cls: "adm-inbox-tag adm-inbox-tag--accent" };
  if (body.includes("crash") || body.includes("bug") || body.includes("incident") || body.includes("error"))
    return { label: "INCIDENT", cls: "adm-inbox-tag adm-inbox-tag--warn" };
  return { label: "SUPPORT", cls: "adm-inbox-tag adm-inbox-tag--danger" };
}

// Person initials
function initials(name: string) {
  return name.trim().split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

const COLORS = ["var(--brand)", "var(--accent)", "#7C3AED", "#D97706", "var(--danger)"];

export function AdminInboxClient({
  messages,
  unreadCount,
}: {
  messages: ContactMessage[];
  unreadCount: number;
}) {
  const [selected, setSelected] = useState<string | null>(messages[0]?.id ?? null);

  const active = messages.find(m => m.id === selected);

  if (messages.length === 0) {
    return (
      <div className="adm-card">
        <div className="adm-empty">
          No messages yet. Contact form submissions from the landing page will appear here.
        </div>
      </div>
    );
  }

  return (
    <div className="adm-inbox">
      {/* Thread list */}
      <div className="adm-inbox__list">
        <div className="adm-card adm-inbox__list-card">
          <div className="adm-card__head">
            <h3>Threads ({messages.length})</h3>
            {unreadCount > 0 && (
              <span className="adm-inbox-tag adm-inbox-tag--danger">{unreadCount} unread</span>
            )}
          </div>
          <div className="adm-card__body adm-card__body--flush">
            {messages.map((msg, i) => {
              const kind = threadKind(msg);
              const isOn = msg.id === selected;
              return (
                <button
                  key={msg.id}
                  className={`adm-inbox-thread${isOn ? " adm-inbox-thread--on" : ""}${i < messages.length - 1 ? " adm-inbox-thread--border" : ""}`}
                  onClick={() => setSelected(msg.id)}
                  type="button"
                >
                  <div className="adm-inbox-thread__head">
                    <strong>{msg.name}</strong>
                    <small>{relTime(msg.createdAt)}</small>
                  </div>
                  <div className="adm-inbox-thread__body">{msg.body.slice(0, 60)}…</div>
                  <span className={kind.cls}>{kind.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Thread detail */}
      <div className="adm-inbox__detail">
        {active ? (
          <div className="adm-card adm-inbox__detail-card">
            <div className="adm-card__head adm-inbox__detail-head">
              <div>
                <h3>{active.body.slice(0, 48)}{active.body.length > 48 ? "…" : ""}</h3>
                <span className="adm-inbox__detail-meta">
                  {active.name} · {relTime(active.createdAt)}
                  {active.mobile ? ` · ${active.mobile}` : ""}
                </span>
              </div>
            </div>
            <div className="adm-card__body">
              {/* Original message */}
              <div className="adm-inbox-bubble">
                {active.body}
              </div>

              {/* Reply draft */}
              <div className="adm-inbox-reply">
                <small className="adm-inbox-reply__label">YOUR REPLY DRAFT</small>
                <textarea
                  className="adm-inbox-reply__area"
                  placeholder="Type your reply…"
                  rows={3}
                />
              </div>

              <div className="adm-inbox-reply-actions">
                <button className="adm-btn adm-btn--ghost" type="button">Save draft</button>
                <button className="adm-btn" type="button">Send reply</button>
              </div>
            </div>
          </div>
        ) : (
          <div className="adm-card">
            <div className="adm-empty">Select a thread to read it.</div>
          </div>
        )}
      </div>
    </div>
  );
}
