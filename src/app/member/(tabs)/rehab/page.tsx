import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { REHAB_CONDITIONS } from "@/lib/rehab/catalog";
import { buildRoutine, conditionExercises, routineMinutes } from "@/lib/rehab/routine";
import { recentFeelings } from "@/lib/rehab/session";
import { getRehabConditions, getRehabSessionsForMember } from "@/lib/rehab/server";
import { countLabel } from "@/lib/today";
import { CheckIcon, ChevronLeft, ChevronRight } from "@/components/app/icons";
import { RehabCard, RehabDisclaimer, RehabTrend } from "@/components/app/rehab/rehab-bits";

export const dynamic = "force-dynamic";

export const metadata = { title: "Rehab & mobility | FitSplit" };

export default async function RehabPage() {
  const user = await requireAuth();
  const [mine, sessions] = await Promise.all([getRehabConditions(user.uid), getRehabSessionsForMember(user.uid, 30)]);
  const feelings = recentFeelings(sessions);
  const combined = buildRoutine(mine);

  return (
    <main className="fs-page">
      <header className="fs-navbar">
        <Link href="/member/settings" className="fs-text-btn fs-navbar__back">
          <ChevronLeft size={18} /> Profile
        </Link>
      </header>
      <header className="fs-head">
        <h1 className="fs-title">Rehab &amp; mobility</h1>
        <p className="fs-soft">Short corrective routines for common aches and posture problems.</p>
      </header>

      {mine.length > 0 && (
        <section className="fs-section" aria-label="Your routine">
          <h2 className="fs-section__title">Your routine</h2>
          <RehabCard minutes={routineMinutes(combined)} count={combined.length} />
        </section>
      )}

      <RehabTrend feelings={feelings} />

      <section className="fs-section">
        <h2 className="fs-section__title">Conditions</h2>
        <div className="fs-group">
          {REHAB_CONDITIONS.map((c) => {
            const list = conditionExercises(c.id);
            const added = mine.includes(c.id);
            return (
              <Link key={c.id} href={`/member/rehab/${c.id}`} className="fs-row fs-row--tap">
                <span className="fs-row__main">
                  <span className="fs-row__title">{c.name}</span>
                  <span className="fs-row__sub">
                    {countLabel(list.length, "exercise")} · ~{routineMinutes(list)} min
                  </span>
                </span>
                {added && (
                  <span className="fs-badge-check" role="img" aria-label="Added to your workouts">
                    <CheckIcon size={14} />
                  </span>
                )}
                <ChevronRight size={18} className="fs-row__chev" />
              </Link>
            );
          })}
        </div>
      </section>

      <RehabDisclaimer />
    </main>
  );
}
