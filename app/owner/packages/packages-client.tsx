"use client";

import { useState } from "react";
import { PackageCard } from "@/components/package-card";
import { PackageForm } from "@/components/package-form";
import { EmptyState } from "@/components/empty-state";
import { Dumbbell, Plus } from "@/components/icons";
import type { Package } from "@/types/domain";

interface PackagesClientProps {
  gymId: string;
  activePackages: Package[];
  inactivePackages: Package[];
}

export function PackagesClient({ gymId, activePackages, inactivePackages }: PackagesClientProps) {
  const [editingPkg, setEditingPkg] = useState<Package | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const isFormOpen = showCreate || Boolean(editingPkg);

  function handleEdit(pkg: Package) {
    setEditingPkg(pkg);
    setShowCreate(false);
  }

  function handleDone() {
    setEditingPkg(null);
    setShowCreate(false);
  }

  return (
    <div className="packages-layout">
      {/* ── Left: package list ── */}
      <div className="packages-list-col">
        <div className="list-panel">
          <div className="panel-title">
            <h2><Dumbbell /> Active packages</h2>
            <button
              className="button button-primary button-sm"
              type="button"
              onClick={() => { setShowCreate(true); setEditingPkg(null); }}
            >
              <Plus /> New package
            </button>
          </div>

          {activePackages.length === 0 ? (
            <div style={{ padding: "32px 20px" }}>
              <EmptyState
                icon={<Dumbbell />}
                heading="No packages yet"
                body="Create your first membership package so members can request to join."
                action={{ label: "Create package", onClick: () => setShowCreate(true) }}
              />
            </div>
          ) : (
            <div className="packages-grid">
              {activePackages.map((pkg) => (
                <PackageCard
                  key={pkg.id}
                  pkg={pkg}
                  gymId={gymId}
                  onEdit={handleEdit}
                />
              ))}
            </div>
          )}
        </div>

        {inactivePackages.length > 0 && (
          <details className="packages-archived">
            <summary className="packages-archived-toggle">
              Inactive packages ({inactivePackages.length})
            </summary>
            <div className="packages-grid packages-grid--inactive">
              {inactivePackages.map((pkg) => (
                <PackageCard
                  key={pkg.id}
                  pkg={pkg}
                  gymId={gymId}
                  onEdit={handleEdit}
                  showActions={false}
                />
              ))}
            </div>
          </details>
        )}
      </div>

      {/* ── Right: create / edit form ── */}
      {isFormOpen && (
        <div className="packages-form-col">
          <div className="list-panel">
            <div className="panel-title">
              <h2>{editingPkg ? `Edit: ${editingPkg.name}` : "New package"}</h2>
            </div>
            <div style={{ padding: "0 20px 20px" }}>
              <PackageForm
                gymId={gymId}
                pkg={editingPkg ?? undefined}
                onDone={handleDone}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
