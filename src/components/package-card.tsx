"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import type { Package } from "@/types/domain";
import { StatusBadge } from "./status-badge";
import { archivePackage } from "@/lib/firebase/actions";

interface PackageCardProps {
  pkg: Package;
  gymId: string;
  onEdit?: (pkg: Package) => void;
  showActions?: boolean;
}

export function PackageCard({ pkg, gymId, onEdit, showActions = true }: PackageCardProps) {
  const [isPending, startTransition] = useTransition();

  function handleDeactivate() {
    startTransition(async () => {
      const result = await archivePackage(gymId, pkg.id);
      if (result.status === "success") toast.success(result.message);
      else toast.error(result.message);
    });
  }

  return (
    <div className="package-card">
      <div className="package-card-header">
        <div className="package-card-name">{pkg.name}</div>
        <StatusBadge status={pkg.isActive ? "active" : "inactive"} />
      </div>

      {pkg.description && (
        <p className="package-card-desc">{pkg.description}</p>
      )}

      <div className="package-card-meta">
        <span className="package-price">
          {pkg.currency} {pkg.price.toLocaleString()}
        </span>
        <span className="package-duration">
          {pkg.durationMonths} month{pkg.durationMonths !== 1 ? "s" : ""}
        </span>
        {pkg.includesPT && (
          <span className="package-pt-badge">
            PT included{pkg.ptSessionsIncluded ? ` (${pkg.ptSessionsIncluded} sessions)` : ""}
          </span>
        )}
      </div>

      {showActions && (
        <div className="package-card-actions">
          {onEdit && (
            <button
              className="button button-secondary button-sm"
              onClick={() => onEdit(pkg)}
              type="button"
            >
              Edit
            </button>
          )}
          {pkg.isActive && (
            <button
              className="button button-ghost button-sm"
              disabled={isPending}
              onClick={handleDeactivate}
              type="button"
            >
              {isPending ? "Deactivating…" : "Deactivate"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
