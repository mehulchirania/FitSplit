/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";
import { getFirebaseAdminServices, hasFirebaseAdminConfig } from "@/lib/firebase/admin";
import { getCurrentUser } from "@/lib/auth";
import { JoinGymForm } from "@/components/join-gym-form";

export const dynamic = "force-dynamic";

async function getPublicListing(gymId: string) {
  if (!hasFirebaseAdminConfig()) return null;
  const { db } = getFirebaseAdminServices();
  const doc = await db.collection("publicListings").doc(gymId).get();
  if (!doc.exists) return null;
  const data = doc.data() ?? {};
  return {
    id: doc.id,
    name: String(data.name ?? "FitSplit gym"),
    city: String(data.city ?? ""),
    description: String(data.description ?? ""),
    coverImageUrl: data.coverImageUrl ? String(data.coverImageUrl) : undefined
  };
}

export default async function DiscoverGymDetailPage({
  params
}: {
  params: Promise<{ gymId: string }>;
}) {
  const { gymId } = await params;
  const [listing, currentUser] = await Promise.all([getPublicListing(gymId), getCurrentUser()]);

  if (!listing) return notFound();

  return (
    <div className="disc-page">
      <header className="disc-header">
        <Link className="disc-brand" href="/">
          <img alt="FitSplit" src="/new_logo.png" />
          <span>FitSplit</span>
        </Link>
        <Link className="disc-back" href="/discover">
          ← All gyms
        </Link>
      </header>

      <div className="disc-detail-cover">
        {listing.coverImageUrl ? (
          <img alt={`${listing.name} cover`} src={listing.coverImageUrl} />
        ) : (
          <span className="disc-card-cover-fallback">{listing.name.slice(0, 2).toUpperCase()}</span>
        )}
      </div>

      <div className="disc-detail-body">
        <p className="disc-eyebrow">Gym</p>
        <h1>{listing.name}</h1>
        {listing.city ? <p className="disc-card-city">{listing.city}</p> : null}
        <p className="disc-detail-desc">{listing.description}</p>

        <div className="disc-join-panel">
          <h2>Request to join</h2>
          {currentUser ? (
            <>
              <p className="disc-join-note">
                The gym owner reviews every request before you&apos;re added to the roster.
              </p>
              <JoinGymForm fullName={currentUser.fullName} gymId={listing.id} />
            </>
          ) : (
            <>
              <p className="disc-join-note">Sign in or create a free FitSplit account to request to join.</p>
              <Link className="button button-primary" href="/signup">
                Sign up to join
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
