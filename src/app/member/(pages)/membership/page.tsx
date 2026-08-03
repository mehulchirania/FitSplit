import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { MembershipRequestForm } from "@/components/membership-request-form";
import { Bell, Calendar } from "@/components/icons";
import { requireRole } from "@/lib/auth";
import { PRIMARY_GYM_ID } from "@/lib/firebase/collections";
import {
  getGymDetail,
  getMemberWithProfile,
  getMembershipsForMember,
  getPackages,
  getPaymentRequestsForMember,
} from "@/lib/firebase/read-models";

export const dynamic = "force-dynamic";

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }).format(new Date(iso));
  } catch { return iso; }
}

function daysUntil(iso: string): number {
  const diff = new Date(iso).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default async function MemberMembershipPage() {
  const currentUser = await requireRole(["member"]);
  const memberId = currentUser.memberId ?? currentUser.uid;
  const gymId = currentUser.gymId ?? PRIMARY_GYM_ID;

  const [{ member }, { gym }, memberships, packages, paymentRequests] = await Promise.all([
    getMemberWithProfile(memberId),
    getGymDetail(gymId),
    getMembershipsForMember(gymId, memberId),
    getPackages(gymId),
    getPaymentRequestsForMember(gymId, memberId),
  ]);

  const activeMembership = memberships.find((m) => m.status === "active");
  const hasPendingRequest = paymentRequests.some((r) => r.status === "pending");
  const daysLeft = activeMembership?.endDate ? daysUntil(activeMembership.endDate) : null;
  const isExpiringSoon = daysLeft !== null && daysLeft <= 7 && daysLeft > 0;
  const isExpired = daysLeft !== null && daysLeft <= 0;

  // The persisted field is written by the scheduled expiry sweep and can lag the
  // real end date by up to a day — never show an "Active" badge next to an
  // "Expired on …" line (docs/14 U5). The date wins.
  const persistedStatus = member?.membershipStatus ?? (activeMembership ? "active" : "expired");
  const membershipStatus = isExpired ? "expired" : persistedStatus;

  return (
    <div className="m3d-subpage membership-page">
      <div className="m3d-subpage__head">
        <h1>Membership</h1>
        <p style={{ color: "var(--text-soft)", fontSize: 13 }}>{gym?.name ?? "Your gym"}</p>
      </div>

      {/* ── Current status card ── */}
      <div className="membership-status-card">
        <div className="msc-left">
          <div className="msc-label">Current status</div>
          <div className="msc-status">
            <StatusBadge status={membershipStatus} />
            {activeMembership?.planName && (
              <span className="msc-plan">{activeMembership.planName}</span>
            )}
          </div>
          {activeMembership?.endDate && (
            <div className={`msc-expiry${isExpiringSoon ? " msc-expiry--warn" : ""}${isExpired ? " msc-expiry--danger" : ""}`}>
              {isExpired ? (
                <>Expired on {formatDate(activeMembership.endDate)}</>
              ) : isExpiringSoon ? (
                <>Expires in {daysLeft} day{daysLeft !== 1 ? "s" : ""} · {formatDate(activeMembership.endDate)}</>
              ) : (
                <>Active until {formatDate(activeMembership.endDate)}</>
              )}
            </div>
          )}
        </div>
        {activeMembership && (
          <div className="msc-right">
            <div className="msc-stat">
              <strong>{activeMembership.durationMonths}</strong>
              <span>month{activeMembership.durationMonths !== 1 ? "s" : ""}</span>
            </div>
            {daysLeft !== null && daysLeft > 0 && (
              <div className="msc-stat">
                <strong>{daysLeft}</strong>
                <span>days left</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Pending request banner ── */}
      {hasPendingRequest && (
        <div className="membership-pending-banner">
          <Bell />
          <span>You have a pending payment request. The gym will review and activate your membership shortly.</span>
        </div>
      )}

      {/* ── Renew / join section ── */}
      {!hasPendingRequest && (isExpired || isExpiringSoon || !activeMembership) && (
        <div className="list-panel">
          <div className="panel-title">
            <h2>
              {activeMembership ? (isExpiringSoon ? "Renew membership" : "Re-join") : "Join a package"}
            </h2>
          </div>
          <div style={{ padding: "0 20px 20px" }}>
            <MembershipRequestForm gymId={gymId} packages={packages} />
          </div>
        </div>
      )}

      {/* ── Active membership — request new one when not expiring ── */}
      {activeMembership && !isExpired && !isExpiringSoon && !hasPendingRequest && (
        <details className="membership-renew-details">
          <summary className="membership-renew-toggle">Request a different package or early renewal</summary>
          <div style={{ padding: "12px 0 0" }}>
            <MembershipRequestForm gymId={gymId} packages={packages} />
          </div>
        </details>
      )}

      {/* ── Payment request history ── */}
      {paymentRequests.length > 0 && (
        <div className="list-panel" style={{ padding: 0 }}>
          <div className="panel-title" style={{ padding: "14px 20px 12px" }}>
            <h2><Bell /> Payment requests</h2>
            <span className="status-pill status-neutral" style={{ fontSize: "0.72rem" }}>{paymentRequests.length}</span>
          </div>
          <div className="payment-history-list">
            {paymentRequests.map((req) => (
              <div key={req.id} className="payment-history-row">
                <div className="phr-left">
                  <div className="phr-package">{req.packageName ?? req.packageId}</div>
                  <div className="phr-meta">
                    <span className="phr-amount">{req.currency} {req.amount.toLocaleString()}</span>
                    <span className="phr-method">{req.method}</span>
                    <span className="phr-date">{formatDate(req.requestedAt)}</span>
                  </div>
                  {req.notes && <div className="phr-notes">{req.notes}</div>}
                </div>
                <StatusBadge status={req.status} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Membership history ── */}
      {memberships.length > 0 && (
        <div className="list-panel" style={{ padding: 0 }}>
          <div className="panel-title" style={{ padding: "14px 20px 12px" }}>
            <h2><Calendar /> Membership history</h2>
          </div>
          <div className="payment-history-list">
            {memberships.map((m) => (
              <div key={m.id} className="payment-history-row">
                <div className="phr-left">
                  <div className="phr-package">{m.planName}</div>
                  <div className="phr-meta">
                    <span className="phr-date">{formatDate(m.startDate)} → {formatDate(m.endDate)}</span>
                    <span className="phr-dur">{m.durationMonths} month{m.durationMonths !== 1 ? "s" : ""}</span>
                  </div>
                </div>
                {m.status && <StatusBadge status={m.status} />}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state: no history at all */}
      {memberships.length === 0 && paymentRequests.length === 0 && !hasPendingRequest && (
        <div className="list-panel" style={{ padding: 0 }}>
          <div className="panel-title" style={{ padding: "14px 20px 12px" }}>
            <h2>Choose a package</h2>
          </div>
          <div style={{ padding: "0 20px 20px" }}>
            <MembershipRequestForm gymId={gymId} packages={packages} />
          </div>
        </div>
      )}

      <div style={{ textAlign: "center", marginTop: 16 }}>
        <Link href="/member" style={{ fontSize: "0.82rem", color: "var(--text-soft)" }}>
          ← Back to dashboard
        </Link>
      </div>
    </div>
  );
}
