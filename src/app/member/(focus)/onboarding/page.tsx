import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { getActivePlan, getPlanSummaries } from "@/lib/member-data";
import { PlanPicker } from "@/components/app/plan-picker";

export const dynamic = "force-dynamic";

/** First run: no plan yet, so the only thing on screen is choosing one. */
export default async function OnboardingPage() {
  const user = await requireAuth();
  if (await getActivePlan(user.uid)) redirect("/member");
  const plans = await getPlanSummaries(user.uid);
  const firstName = user.fullName.trim().split(/\s+/)[0];

  return (
    <main className="fs-page fs-page--focus">
      <header className="fs-head">
        <h1 className="fs-title">Choose your plan</h1>
        <p className="fs-soft">
          {firstName ? `${firstName}, pick` : "Pick"} a plan to follow. You can change it whenever you like.
        </p>
      </header>
      <PlanPicker plans={plans} activeId={null} mode="onboarding" />
    </main>
  );
}
