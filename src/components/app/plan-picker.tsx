"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { activatePlan, deleteCustomPlan } from "@/lib/firebase/actions/programs";
import { orderPlans, type PlanSummary } from "@/lib/plan-catalog";
import { countLabel } from "@/lib/today";
import { CheckIcon, ChevronRight, PlusIcon } from "./icons";
import { Sheet } from "./sheet";

const LEVEL_LABEL = { beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced" } as const;

function meta(plan: PlanSummary) {
  const parts = [`${countLabel(plan.daysPerWeek, "day")} a week`];
  if (plan.source === "predefined") parts.push(LEVEL_LABEL[plan.difficulty]);
  parts.push(countLabel(plan.exerciseCount, "exercise"));
  return parts.join(" · ");
}

function PlanRow({ plan, active, onOpen, showBlurb }: { plan: PlanSummary; active: boolean; onOpen: () => void; showBlurb?: boolean }) {
  return (
    <button type="button" className="fs-row fs-row--tap" onClick={onOpen}>
      <span className="fs-row__main">
        <span className="fs-row__title">{plan.title}</span>
        <span className="fs-row__sub">{meta(plan)}</span>
        {showBlurb && <span className="fs-row__blurb">{plan.blurb}</span>}
      </span>
      {active ? (
        <span className="fs-badge-check" aria-label="Current plan">
          <CheckIcon size={14} />
        </span>
      ) : (
        <ChevronRight size={18} className="fs-row__chev" />
      )}
    </button>
  );
}

function PlanSheet({
  plan,
  open,
  active,
  onClose,
  onChosen,
  firstPlan
}: {
  plan: PlanSummary | null;
  open: boolean;
  active: boolean;
  onClose: () => void;
  onChosen: () => void;
  firstPlan: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function choose() {
    if (!plan) return;
    startTransition(async () => {
      const res = await activatePlan(plan.id);
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      onChosen();
      router.replace("/member");
      router.refresh();
    });
  }

  function remove() {
    if (!plan) return;
    startTransition(async () => {
      const res = await deleteCustomPlan(plan.id);
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success("Plan deleted");
      onClose();
      router.refresh();
    });
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={plan?.title ?? ""}
      footer={
        plan && (
          <div className="fs-stack">
            <button type="button" className="fs-btn fs-btn--primary fs-btn--lg" disabled={pending || active} onClick={choose}>
              {active ? "Current plan" : pending ? "Setting up…" : firstPlan ? "Start this plan" : "Switch to this plan"}
            </button>
            {plan.source === "custom" && (
              <button type="button" className="fs-btn fs-btn--danger-plain" disabled={pending} onClick={remove}>
                Delete plan
              </button>
            )}
          </div>
        )
      }
    >
      {plan && (
        <div className="fs-stack fs-stack--lg">
          <div className="fs-stack">
            <p className="fs-soft">{meta(plan)}</p>
            <p>{plan.blurb}</p>
          </div>
          <div className="fs-group">
            {plan.days.map((d, i) => (
              <details key={d.id} className="fs-disclose">
                <summary className="fs-row fs-row--tap">
                  <span className="fs-row__main">
                    <span className="fs-row__title">{d.title}</span>
                    <span className="fs-row__sub">
                      Day {i + 1} · {countLabel(d.exercises.length, "exercise")}
                    </span>
                  </span>
                  <ChevronRight size={18} className="fs-row__chev fs-disclose__chev" />
                </summary>
                <ol className="fs-disclose__list">
                  {d.exercises.map((e, j) => (
                    <li key={`${e.name}-${j}`}>
                      <span>{e.name}</span>
                      <span className="fs-num">
                        {e.sets} × {e.reps}
                      </span>
                    </li>
                  ))}
                </ol>
              </details>
            ))}
          </div>
        </div>
      )}
    </Sheet>
  );
}

/**
 * The plan list used by onboarding ("Choose your plan") and by the Plans tab.
 * Picking a plan opens a preview sheet; confirming there makes it the active plan.
 */
export function PlanPicker({
  plans,
  activeId,
  mode
}: {
  plans: PlanSummary[];
  activeId: string | null;
  mode: "onboarding" | "manage";
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const selected = plans.find((p) => p.id === openId) ?? null;
  const [lastSelected, setLastSelected] = useState<PlanSummary | null>(null);
  const sheetPlan = selected ?? lastSelected;

  const mine = plans.filter((p) => p.source === "custom");
  const { featured, rest } = orderPlans(plans.filter((p) => p.source !== "custom" && p.id !== activeId));
  const current = activeId ? plans.find((p) => p.id === activeId) ?? null : null;

  function open(plan: PlanSummary) {
    setLastSelected(plan);
    setOpenId(plan.id);
  }

  const createRow = (
    <Link href="/member/create-plan" className="fs-row fs-row--tap">
      <span className="fs-row__icon fs-row__icon--fill">
        <PlusIcon size={18} />
      </span>
      <span className="fs-row__main">
        <span className="fs-row__title">Create your own</span>
        <span className="fs-row__sub">Name it, set your days, pick the exercises</span>
      </span>
      <ChevronRight size={18} className="fs-row__chev" />
    </Link>
  );

  return (
    <>
      {mode === "manage" && current && (
        <section className="fs-section">
          <h2 className="fs-section__title">Current plan</h2>
          <div className="fs-group">
            <PlanRow plan={current} active onOpen={() => open(current)} />
          </div>
        </section>
      )}

      {mine.filter((p) => p.id !== activeId).length > 0 && (
        <section className="fs-section">
          <h2 className="fs-section__title">Your plans</h2>
          <div className="fs-group">
            {mine
              .filter((p) => p.id !== activeId)
              .map((p) => (
                <PlanRow key={p.id} plan={p} active={false} onOpen={() => open(p)} />
              ))}
          </div>
        </section>
      )}

      <section className="fs-section">
        <h2 className="fs-section__title">{mode === "onboarding" ? "Popular starting points" : "Recommended"}</h2>
        <div className="fs-group">
          {featured.map((p) => (
            <PlanRow key={p.id} plan={p} active={false} onOpen={() => open(p)} showBlurb />
          ))}
        </div>
      </section>

      <section className="fs-section">
        <div className="fs-group">{createRow}</div>
      </section>

      {rest.length > 0 && (
        <section className="fs-section">
          <h2 className="fs-section__title">More plans</h2>
          {showAll || mode === "manage" ? (
            <div className="fs-group">
              {rest.map((p) => (
                <PlanRow key={p.id} plan={p} active={false} onOpen={() => open(p)} />
              ))}
            </div>
          ) : (
            <div className="fs-group">
              <button type="button" className="fs-row fs-row--tap" onClick={() => setShowAll(true)}>
                <span className="fs-row__main">
                  <span className="fs-row__title">Browse {rest.length} more plans</span>
                  <span className="fs-row__sub">Bro split, PHUL, PHAT, bodyweight, dumbbell only and more</span>
                </span>
                <ChevronRight size={18} className="fs-row__chev" />
              </button>
            </div>
          )}
        </section>
      )}

      <PlanSheet
        plan={sheetPlan}
        open={selected !== null}
        active={sheetPlan?.id === activeId}
        firstPlan={activeId === null}
        onClose={() => setOpenId(null)}
        onChosen={() => setOpenId(null)}
      />
    </>
  );
}
