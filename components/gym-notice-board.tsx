"use client";

import { useEffect, useRef, useState } from "react";
import type { GymNotice } from "@/types/domain";

const TYPE_CONFIG: Record<string, { label: string; accent: string }> = {
  rule:         { label: "Gym Rule",     accent: "#ef4444" },
  tip:          { label: "Training Tip", accent: "var(--brand)" },
  reminder:     { label: "Reminder",     accent: "#f59e0b" },
  announcement: { label: "Notice",       accent: "#60a5fa" },
};

const AUTO_MS = 7000;

export function GymNoticeBoard({ notices }: { notices: GymNotice[] }) {
  const active = notices.filter((n) => n.isActive && n.title);
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const mountedRef = useRef(true);
  const advanceRef = useRef<() => void>(() => {});

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  function goTo(next: number) {
    if (!visible) return;
    setVisible(false);
    setTimeout(() => {
      if (!mountedRef.current) return;
      setIdx(next);
      setVisible(true);
    }, 320);
  }

  // Always points to latest goTo+idx without stale closures
  advanceRef.current = () => goTo((idx + 1) % active.length);

  useEffect(() => {
    if (active.length <= 1 || isPaused) return;
    const timer = setInterval(() => advanceRef.current(), AUTO_MS);
    return () => clearInterval(timer);
  }, [active.length, isPaused]);

  if (active.length === 0) return null;

  const safeIdx = Math.min(idx, active.length - 1);
  const notice = active[safeIdx];
  const config = TYPE_CONFIG[notice.type] ?? TYPE_CONFIG.tip;

  const badgeStyle = {
    color: config.accent,
    borderColor: `color-mix(in srgb, ${config.accent} 30%, transparent)`,
    background: `color-mix(in srgb, ${config.accent} 10%, transparent)`
  };
  const sectionStyle = { "--gnb-accent": config.accent } as React.CSSProperties;
  const progressStyle = { "--gnb-duration": `${AUTO_MS}ms` } as React.CSSProperties;

  return (
    <div style={sectionStyle}>
      <p className="gnb-section-label">From your gym</p>
    <section
      aria-label="Gym notices"
      className="gnb"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Animated content */}
      <div
        className={`gnb-content ${visible ? "gnb-visible" : "gnb-hidden"}`}
      >
        <div className="gnb-header">
          <span className="gnb-type-badge" style={badgeStyle}>
            {config.label}
          </span>
          {active.length > 1 && (
            <span className="gnb-counter">{safeIdx + 1} / {active.length}</span>
          )}
        </div>

        <p className="gnb-title">{notice.title}</p>
        {notice.body && <p className="gnb-body">{notice.body}</p>}
      </div>

      {/* Navigation */}
      {active.length > 1 && (
        <div className="gnb-footer">
          <div className="gnb-dots" role="tablist" aria-label="Notice navigation">
            {active.map((_, i) => (
              <button
                aria-label={`Notice ${i + 1}`}
                aria-selected={i === safeIdx}
                className={`gnb-dot ${i === safeIdx ? "gnb-dot-active" : ""}`}
                key={i}
                onClick={() => goTo(i)}
                role="tab"
                type="button"
              />
            ))}
          </div>
          <div className="gnb-arrows">
            <button
              aria-label="Previous notice"
              className="gnb-arrow"
              onClick={() => goTo((safeIdx - 1 + active.length) % active.length)}
              type="button"
            >
              ‹
            </button>
            <button
              aria-label="Next notice"
              className="gnb-arrow"
              onClick={() => goTo((safeIdx + 1) % active.length)}
              type="button"
            >
              ›
            </button>
          </div>
        </div>
      )}

      {/* Auto-advance progress bar — resets every time idx or pause state changes */}
      {active.length > 1 && !isPaused && (
        <div
          className="gnb-progress"
          key={`${safeIdx}-${isPaused}`}
          style={progressStyle}
        />
      )}
    </section>
    </div>
  );
}
