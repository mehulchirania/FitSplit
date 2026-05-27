"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { Package } from "@/types/domain";
import { submitPaymentRequestAction } from "@/lib/firebase/actions";

const METHODS = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "card", label: "Card" },
  { value: "other", label: "Other" },
];

interface MembershipRequestFormProps {
  gymId: string;
  packages: Package[];
}

export function MembershipRequestForm({ gymId, packages }: MembershipRequestFormProps) {
  const [selectedPkg, setSelectedPkg] = useState<string>("");
  const [method, setMethod] = useState<string>("cash");
  const [isPending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);

  const activePackages = packages.filter((p) => p.isActive);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedPkg) { toast.error("Please select a package."); return; }
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await submitPaymentRequestAction(gymId, { status: "idle", message: "" }, fd);
      if (result.status === "success") {
        toast.success(result.message);
        setSubmitted(true);
      } else {
        toast.error(result.message);
      }
    });
  }

  if (submitted) {
    return (
      <div className="membership-submitted">
        <div className="membership-submitted-icon">✓</div>
        <h3>Request submitted!</h3>
        <p>The gym will review your payment and activate your membership. You&apos;ll receive a notification once it&apos;s approved.</p>
      </div>
    );
  }

  if (activePackages.length === 0) {
    return (
      <p style={{ color: "var(--text-soft)", fontSize: "0.88rem" }}>
        No packages are currently available. Please contact your gym directly.
      </p>
    );
  }

  return (
    <form className="membership-request-form" onSubmit={handleSubmit}>
      <div className="form-row">
        <label className="form-label">Select a package *</label>
        <div className="pkg-option-list">
          {activePackages.map((pkg) => (
            <label
              key={pkg.id}
              className={`pkg-option${selectedPkg === pkg.id ? " is-selected" : ""}`}
            >
              <input
                type="radio"
                name="packageId"
                value={pkg.id}
                checked={selectedPkg === pkg.id}
                onChange={() => setSelectedPkg(pkg.id)}
                disabled={isPending}
              />
              <div className="pkg-option-body">
                <div className="pkg-option-name">{pkg.name}</div>
                <div className="pkg-option-meta">
                  <span className="pkg-option-price">{pkg.currency} {pkg.price.toLocaleString()}</span>
                  <span className="pkg-option-dur">{pkg.durationMonths} month{pkg.durationMonths !== 1 ? "s" : ""}</span>
                  {pkg.includesPT && (
                    <span className="pkg-option-pt">PT included{pkg.ptSessionsIncluded ? ` (${pkg.ptSessionsIncluded} sessions)` : ""}</span>
                  )}
                </div>
                {pkg.description && (
                  <div className="pkg-option-desc">{pkg.description}</div>
                )}
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="form-row">
        <label className="form-label" htmlFor="payment-method">Payment method</label>
        <div className="method-pills">
          {METHODS.map((m) => (
            <label key={m.value} className={`method-pill${method === m.value ? " is-selected" : ""}`}>
              <input
                type="radio"
                name="method"
                value={m.value}
                checked={method === m.value}
                onChange={() => setMethod(m.value)}
                disabled={isPending}
              />
              {m.label}
            </label>
          ))}
        </div>
      </div>

      <button
        type="submit"
        className="button button-primary"
        disabled={isPending || !selectedPkg}
      >
        {isPending ? "Submitting…" : "Request membership"}
      </button>
      <p style={{ fontSize: "0.78rem", color: "var(--text-soft)", marginTop: 8 }}>
        Your request will be reviewed by the gym. Membership activates after payment is confirmed.
      </p>
    </form>
  );
}
