import { requireAuth } from "@/lib/auth";
import { getActivePlan, getPlanSummaries } from "@/lib/member-data";
import { PlanPicker } from "@/components/app/plan-picker";

export const dynamic = "force-dynamic";

export default async function PlansPage() {
  const user = await requireAuth();
  const [plans, active] = await Promise.all([getPlanSummaries(user.uid), getActivePlan(user.uid)]);

  return (
    <main className="fs-page">
      <header className="fs-head">
        <h1 className="fs-title">Plans</h1>
        <p className="fs-soft">{active ? "Switch plans any time. Your history stays." : "Pick a plan to start training."}</p>
      </header>
      <PlanPicker plans={plans} activeId={active?.program.id ?? null} mode="manage" />
    </main>
  );
}
