import { requireAuth } from "@/lib/auth";
import { getActivePlan } from "@/lib/member-data";
import { PlanBuilder } from "@/components/app/plan-builder";

export const dynamic = "force-dynamic";

export default async function CreatePlanPage() {
  const user = await requireAuth();
  const active = await getActivePlan(user.uid);
  return <PlanBuilder backHref={active ? "/member/programs" : "/member/onboarding"} />;
}
