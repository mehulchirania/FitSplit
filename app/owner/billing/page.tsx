import Link from "next/link";
import { Breadcrumb } from "@/components/breadcrumb";
import { PaymentRequestCard } from "@/components/payment-request-card";
import { EmptyState } from "@/components/empty-state";
import { StatCard } from "@/components/stat-card";
import { Bell } from "@/components/icons";
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
  const currentUser = await requireRole(["owner"]);
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
    <main className="page">
      <header className="page-header">
        <Breadcrumb crumbs={[{ label: "Dashboard", href: "/owner" }, { label: "Billing" }]} />
        <p className="eyebrow">Payments</p>
        <h1>Billing &amp; Payments</h1>
        <p>Review membership payment requests from members and approve or reject them.</p>
      </header>

      {/* Summary stats */}
      <div className="billing-stats">
        <StatCard
          label="Pending"
          value={pendingCount}
          accent={pendingCount > 0 ? "amber" : "default"}
        />
        <StatCard
          label="Approved"
          value={approvedCount}
          accent="green"
        />
        <StatCard
          label="Total revenue"
          value={`${currency} ${totalRevenue.toLocaleString()}`}
          accent="blue"
          sub="Approved payments"
        />
        <StatCard
          label="Rejected"
          value={rejectedCount}
          accent={rejectedCount > 0 ? "red" : "default"}
        />
      </div>

      {/* Filter tabs */}
      <nav className="members-filter-tabs billing-filter-tabs" aria-label="Filter payment requests">
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
              className={activeFilter === tab.value ? "is-selected" : ""}
              aria-current={activeFilter === tab.value ? "page" : undefined}
            >
              {tab.label}
              <span className={`ftab-count${tab.value === "pending" && pendingCount > 0 ? " ftab-alert" : ""}`}>
                {count}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Request list */}
      <div className="list-panel" style={{ padding: 0 }}>
        <div className="panel-title" style={{ padding: "14px 20px 12px" }}>
          <h2><Bell /> Payment requests</h2>
          <span className="status-pill status-neutral" style={{ fontSize: "0.72rem" }}>{filtered.length}</span>
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: "32px 20px" }}>
            <EmptyState
              icon={<Bell />}
              heading="No requests found"
              body={activeFilter === "pending" ? "No pending payment requests. You're all caught up!" : "No requests match this filter."}
            />
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
    </main>
  );
}
