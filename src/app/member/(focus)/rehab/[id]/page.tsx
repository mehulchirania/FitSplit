import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { conditionExercises, dosageLabel, getCondition, routineMinutes } from "@/lib/rehab/routine";
import { getRehabConditions } from "@/lib/rehab/server";
import { countLabel } from "@/lib/today";
import { ChevronLeft, ChevronRight } from "@/components/app/icons";
import { RehabDisclaimer } from "@/components/app/rehab/rehab-bits";
import { RehabToggle } from "@/components/app/rehab/rehab-toggle";

export const dynamic = "force-dynamic";

export default async function RehabConditionPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  const { id } = await params;
  const condition = getCondition(id);
  if (!condition) notFound();

  const added = (await getRehabConditions(user.uid)).includes(condition.id);
  const exercises = conditionExercises(condition.id);

  return (
    <main className="fs-page fs-page--focus fs-page--cta">
      <header className="fs-navbar">
        <Link href="/member/rehab" className="fs-text-btn fs-navbar__back">
          <ChevronLeft size={18} /> Rehab
        </Link>
      </header>
      <header className="fs-head">
        <h1 className="fs-title">{condition.name}</h1>
        <p className="fs-soft">{condition.forWho}</p>
      </header>

      <section className="fs-section">
        <div className="fs-group">
          <RehabToggle conditionId={condition.id} initial={added} />
        </div>
      </section>

      <section className="fs-section">
        <h2 className="fs-section__title">Likely causes</h2>
        <div className="fs-group">
          <ul className="fs-plain-list fs-rehab-causes">
            {condition.causes.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="fs-section">
        <h2 className="fs-section__title">
          Routine · {countLabel(exercises.length, "exercise")} · ~{routineMinutes(exercises)} min
        </h2>
        <div className="fs-group">
          {exercises.map((e, i) => (
            <details key={e.id} className="fs-disclose">
              <summary className="fs-row fs-row--tap">
                <span className="fs-rehab-n fs-num" aria-hidden="true">
                  {i + 1}
                </span>
                <span className="fs-row__main">
                  <span className="fs-row__title">{e.name}</span>
                  <span className="fs-row__sub fs-num">{dosageLabel(e.dosage)}</span>
                </span>
                <ChevronRight size={18} className="fs-row__chev fs-disclose__chev" />
              </summary>
              <div className="fs-rehab-ex">
                <p className="fs-soft">Targets: {e.target}</p>
                <ol className="fs-steps">
                  {e.cues.map((c, k) => (
                    <li key={k}>{c}</li>
                  ))}
                </ol>
                <p className="fs-rp__stop">
                  <strong>Stop if</strong> {e.stopIf.replace(/^Stop if /, "")}
                </p>
                {e.equipment && <p className="fs-soft">You will need: {e.equipment}</p>}
              </div>
            </details>
          ))}
        </div>
      </section>

      <RehabDisclaimer />

      <div className="fs-sticky-cta">
        <Link href={`/member/rehab/play?c=${condition.id}`} className="fs-btn fs-btn--primary fs-btn--lg">
          Start routine
        </Link>
      </div>
    </main>
  );
}
