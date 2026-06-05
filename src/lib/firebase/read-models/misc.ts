import type { SiteLink } from "@/types/domain";

import { collectionPaths } from "../collections";
import { getFirebaseAdminServices, hasFirebaseAdminConfig } from "../admin";

export async function getSiteLinks(): Promise<{
  links: SiteLink[];
  isPersisted: boolean;
}> {
  const fallback: SiteLink[] = [
    { id: "instagram", label: "Instagram profile", href: "#" },
    { id: "linkedin", label: "LinkedIn profile", href: "#" },
    { id: "youtube", label: "YouTube profile", href: "#" },
    { id: "email", label: "mehul@example.com", href: "mailto:mehul@example.com" }
  ];

  if (!hasFirebaseAdminConfig()) {
    return { links: fallback, isPersisted: false };
  }

  try {
    const { db } = getFirebaseAdminServices();
    const snapshot = await db.collection(collectionPaths.siteLinks).get();
    const links = snapshot.docs
      .map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          label: String(data.label ?? doc.id),
          href: String(data.href ?? "#")
        };
      })
      .sort((left, right) => left.id.localeCompare(right.id));

    return { links: links.length ? links : fallback, isPersisted: links.length > 0 };
  } catch {
    return { links: fallback, isPersisted: false };
  }
}
