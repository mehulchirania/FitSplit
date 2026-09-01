/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { getFirebaseAdminServices, hasFirebaseAdminConfig } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

type PublicListingRow = {
  id: string;
  name: string;
  city: string;
  description: string;
  coverImageUrl?: string;
};

async function getPublicListings(): Promise<PublicListingRow[]> {
  if (!hasFirebaseAdminConfig()) return [];

  const { db } = getFirebaseAdminServices();
  const snapshot = await db.collection("publicListings").get();

  return snapshot.docs
    .map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: String(data.name ?? "FitSplit gym"),
        city: String(data.city ?? ""),
        description: String(data.description ?? ""),
        coverImageUrl: data.coverImageUrl ? String(data.coverImageUrl) : undefined
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export default async function DiscoverPage() {
  const listings = await getPublicListings();

  return (
    <div className="disc-page">
      <header className="disc-header">
        <Link className="disc-brand" href="/">
          <img alt="FitSplit" src="/new_logo.png" />
          <span>FitSplit</span>
        </Link>
        <Link className="button button-primary disc-header-cta" href="/signup">
          Sign up
        </Link>
      </header>

      <section className="disc-hero">
        <p className="disc-eyebrow">Marketplace</p>
        <h1>Find a gym worth showing up for.</h1>
        <p className="disc-hero-sub">
          Browse gyms that opted in to public discovery, then request to join — the owner reviews every
          request before you&apos;re on the roster.
        </p>
      </section>

      {listings.length === 0 ? (
        <div className="disc-empty">
          <p>No gyms are listed on the marketplace yet. Check back soon.</p>
        </div>
      ) : (
        <div className="disc-grid">
          {listings.map((gym) => (
            <Link className="disc-card" href={`/discover/${gym.id}`} key={gym.id}>
              <div className="disc-card-cover">
                {gym.coverImageUrl ? (
                  <img alt={`${gym.name} cover`} src={gym.coverImageUrl} />
                ) : (
                  <span className="disc-card-cover-fallback">{gym.name.slice(0, 2).toUpperCase()}</span>
                )}
              </div>
              <div className="disc-card-body">
                <h2>{gym.name}</h2>
                {gym.city ? <p className="disc-card-city">{gym.city}</p> : null}
                <p className="disc-card-desc">{gym.description}</p>
              </div>
              <span className="disc-card-cta">View gym →</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
