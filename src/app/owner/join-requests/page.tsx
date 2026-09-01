import { requireOwnerPage } from "@/lib/auth";
import { PRIMARY_GYM_ID } from "@/lib/firebase/collections";
import { getFirebaseAdminServices, hasFirebaseAdminConfig } from "@/lib/firebase/admin";
import { JoinRequestsQueue } from "@/components/join-requests-queue";
import type { JoinRequestRow } from "@/components/join-requests-queue";

export const dynamic = "force-dynamic";

async function getPendingJoinRequests(gymId: string): Promise<JoinRequestRow[]> {
  if (!hasFirebaseAdminConfig()) return [];

  const { db } = getFirebaseAdminServices();
  const snapshot = await db
    .collection("gyms")
    .doc(gymId)
    .collection("joinRequests")
    .where("status", "==", "pending")
    .orderBy("requestedAt", "desc")
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      requesterName: String(data.requesterName ?? "FitSplit user"),
      requesterPhone: data.requesterPhone ? String(data.requesterPhone) : undefined,
      message: data.message ? String(data.message) : undefined,
      requestedAt: String(data.requestedAt ?? "")
    };
  });
}

export default async function OwnerJoinRequestsPage() {
  const currentUser = await requireOwnerPage();
  const gymId = currentUser.gymId ?? PRIMARY_GYM_ID;
  const requests = await getPendingJoinRequests(gymId);

  return (
    <div className="odp2-scroll">
      <div className="adm-page-head">
        <div>
          <div className="adm-crumb">Dashboard / Join requests</div>
          <h1 className="adm-title">Marketplace join requests</h1>
        </div>
      </div>
      <p className="adm-page-desc">
        People who found your gym on the FitSplit marketplace and asked to join. Approving adds them to your
        roster; declining just closes the request.
      </p>

      <div className="content-grid">
        <div className="form-panel">
          <JoinRequestsQueue gymId={gymId} requests={requests} />
        </div>
      </div>
    </div>
  );
}
