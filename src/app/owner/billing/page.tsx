import Link from "next/link";
import { PaymentRequestCard } from "@/components/payment-request-card";
import { requireRole } from "@/lib/auth";
import { PRIMARY_GYM_ID } from "@/lib/firebase/collections";
import { getPaymentRequests } from "@/lib/firebase/read-models";

export const dynamic = "force-dynamic";

type StatusFilter = "all" | "pending" | "approved" | "rejected" | "cancelled";

const filterTabs: { label: string; value: StatusFilter }[] = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
];

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const currentUser = await requireRole(["admin", "owner"]);
  const gymId = currentUser.gymId ?? PRIMARY_GYM_ID;
  const { status: rawStatus } = await searchParams;

  const activeFilter = (rawStatus && filterTabs.some((t) => t.value === rawStatus) ? rawStatus : "all") as StatusFilter;

  const allRequests = await getPaymentRequests(gymId);
  const pendingCount = allRequests.filter((r) => r.status === "pending").length;
  const approvedCount = allRequests.filter((r) => r.status === "approved").length;
  const rejectedCount = allRequests.filter((r) => r.status === "rejected").length;

  const totalRevenue = allRequests
    .filter((r) => r.status === "approved")
    .reduce((sum, r) => sum + r.amount, 0);

  const filtered = activeFilter === "all"
    ? allRequests
    : allRequests.filter((r) => r.status === activeFilter);

  const currency = allRequests[0]?.currency ?? "INR";

  return (
    <div className="odp2-scroll">
      <div className="adm-page-head">
        <div>
          <div className="adm-crumb">Dashboard / Billing</div>
          <h1 className="adm-title">Billing &amp; payments</h1>
        </div>
      </div>
      <p className="adm-page-desc">Review membership payment requests from members and approve or reject them.</p>

      <div className="adm-kpis" style={{ marginBottom: 16 }}>
        <div className={`adm-kpi${pendingCount > 0 ? " adm-kpi--warn" : ""}`}>
          <small>PENDING</small>
          <strong>{pendingCount}</strong>
        </div>
        <div className="adm-kpi adm-kpi--brand">
          <small>APPROVED</small>
          <strong>{approvedCount}</strong>
        </div>
        <div className="adm-kpi adm-kpi--accent">
          <small>TOTAL REVENUE</small>
          <strong>{currency} {totalRevenue.toLocaleString()}</strong>
        </div>
        <div className={`adm-kpi${rejectedCount > 0 ? " adm-kpi--danger" : ""}`}>
          <small>REJECTED</small>
          <strong>{rejectedCount}</strong>
        </div>
      </div>

      <div className="adm-filter-bar" style={{ marginBottom: 16 }}>
        <div className="adm-chips">
          {filterTabs.map((tab) => {
            const count =
              tab.value === "all" ? allRequests.length :
              tab.value === "pending" ? pendingCount :
              tab.value === "approved" ? approvedCount :
              rejectedCount;
            return (
              <Link
                key={tab.value}
                href={tab.value === "all" ? "/owner/billing" : `/owner/billing?status=${tab.value}`}
                className={`adm-chip${activeFilter === tab.value ? " adm-chip--on" : ""}`}
              >
                {tab.label} <span style={{ opacity: 0.65 }}>({count})</span>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="adm-card">
        <div className="adm-card__head">
          <h3>Payment requests</h3>
          <span className="adm-inbox-tag adm-inbox-tag--ok">{filtered.length}</span>
        </div>
        <div className="adm-card__body adm-card__body--flush">
          {filtered.length === 0 ? (
            <div className="adm-empty">
              {activeFilter === "pending" ? "No pending payment requests. You're all caught up!" : "No requests match this filter."}
            </div>
          ) : (
            <div className="billing-request-list">
              {filtered.map((req) => (
                <PaymentRequestCard
                  key={req.id}
                  req={req}
                  gymId={gymId}
                  showActions={activeFilter === "all" || activeFilter === "pending"}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
