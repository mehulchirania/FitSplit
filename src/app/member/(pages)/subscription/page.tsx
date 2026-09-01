import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getSubscriptionEventsForUser } from "@/lib/firebase/read-models";
import { MemberSubscriptionUpgradeButton } from "@/components/member-subscription-client";
import type { SubscriptionEvent } from "@/types/domain";

export const dynamic = "force-dynamic";

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("en-IN", {
      day: "numeric", month: "short", year: "numeric",
      timeZone: "Asia/Kolkata"
    }).format(new Date(iso));
  } catch { return iso; }
}

const EVENT_LABELS: Record<SubscriptionEvent["type"], (plan: string) => string> = {
  upgrade_requested: (plan) => `Requested upgrade to ${plan}`,
  upgrade_stubbed: (plan) => `Requested upgrade to ${plan}`,
  cancelled: (plan) => `Cancelled ${plan}`,
};

function planLabel(plan: SubscriptionEvent["plan"]) {
  return plan === "pro" ? "Pro" : "Free";
}

export default async function MemberSubscriptionPage() {
  const currentUser = await requireRole(["member"]);
  const plan = currentUser.plan === "pro" ? "pro" : "free";

  const events = await getSubscriptionEventsForUser(currentUser.uid);

  return (
    <div className="m3d-subpage">
      <div className="m3d-subpage__head">
        <h1>Subscription</h1>
        <p>Your plan and billing history.</p>
      </div>

      {/* ── Plan cards ── */}
      <div className="sub-plan-grid">
        <div className={`sub-plan-card${plan === "free" ? " sub-plan-card--current" : ""}`}>
          <div className="sub-plan-card__head">
            <span className="sub-plan-card__name">Free</span>
            {plan === "free" && <span className="sub-plan-card__badge">Your plan</span>}
          </div>
          <p className="sub-plan-card__desc">
            Everything in FitSplit today — programs, logging, coach messages, and progress
            tracking — at no cost.
          </p>
          <ul className="sub-plan-card__list">
            <li>Full workout &amp; nutrition tracking</li>
            <li>Coach messaging and PT history</li>
            <li>Progress and body-metric charts</li>
          </ul>
        </div>

        <div className={`sub-plan-card sub-plan-card--pro${plan === "pro" ? " sub-plan-card--current" : ""}`}>
          <div className="sub-plan-card__head">
            <span className="sub-plan-card__name">Pro</span>
            <span className="sub-plan-card__badge sub-plan-card__badge--accent">
              {plan === "pro" ? "Your plan" : "Coming soon"}
            </span>
          </div>
          <p className="sub-plan-card__desc">
            Pro billing isn&apos;t live yet. Requesting a spot now costs nothing and just tells
            us you&apos;re interested — we&apos;ll reach out by email when it&apos;s ready.
          </p>
          <MemberSubscriptionUpgradeButton currentPlan={plan} />
        </div>
      </div>

      {/* ── History ── */}
      <div className="list-panel" style={{ padding: 0 }}>
        <div className="panel-title" style={{ padding: "14px 20px 12px" }}>
          <h2>Subscription activity</h2>
        </div>
        {events.length === 0 ? (
          <p style={{ padding: "0 20px 20px", color: "var(--text-soft)", fontSize: "0.85rem" }}>
            No subscription activity yet.
          </p>
        ) : (
          <div className="payment-history-list">
            {events.map((event) => (
              <div key={event.id} className="payment-history-row">
                <div className="phr-left">
                  <div className="phr-package">
                    {EVENT_LABELS[event.type](planLabel(event.plan))}
                  </div>
                  <div className="phr-meta">
                    <span className="phr-date">{formatDate(event.createdAt)}</span>
                  </div>
                  {event.notes && <div className="phr-notes">{event.notes}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ textAlign: "center", marginTop: 16 }}>
        <Link href="/member" style={{ fontSize: "0.82rem", color: "var(--text-soft)" }}>
          ← Back to dashboard
        </Link>
      </div>
    </div>
  );
}
