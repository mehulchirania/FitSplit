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
    <div className="odp2-scroll">
      <div className="adm-page-head">
        <div>
          <div className="adm-crumb">Dashboard / Packages</div>
          <h1 className="adm-title">Membership packages</h1>
        </div>
      </div>
      <p className="adm-page-desc">
        Define the membership plans your gym offers. Members can request a package and you approve or reject the payment.
      </p>

      <PackagesClient
        gymId={gymId}
        activePackages={activePackages}
        inactivePackages={inactivePackages}
      />
    </div>
  );
}
