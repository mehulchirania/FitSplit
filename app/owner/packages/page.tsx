import { Breadcrumb } from "@/components/breadcrumb";
import { EmptyState } from "@/components/empty-state";
import { Dumbbell } from "@/components/icons";
import { PackagesClient } from "./packages-client";
import { requireRole } from "@/lib/auth";
import { PRIMARY_GYM_ID } from "@/lib/firebase/collections";
import { getPackages } from "@/lib/firebase/read-models";

export const dynamic = "force-dynamic";

export default async function PackagesPage() {
  const currentUser = await requireRole(["admin", "owner"]);
  const gymId = currentUser.gymId ?? PRIMARY_GYM_ID;

  const packages = await getPackages(gymId);

  const activePackages = packages.filter((p) => p.isActive);
  const inactivePackages = packages.filter((p) => !p.isActive);

  return (
    <main className="page">
      <header className="page-header">
        <Breadcrumb crumbs={[{ label: "Dashboard", href: "/owner" }, { label: "Packages" }]} />
        <p className="eyebrow">Membership</p>
        <h1>Packages</h1>
        <p>Define the membership plans your gym offers. Members can request a package and you approve or reject the payment.</p>
      </header>

      <PackagesClient
        gymId={gymId}
        activePackages={activePackages}
        inactivePackages={inactivePackages}
      />
    </main>
  );
}
