import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { buildRoutine, sanitizeConditionIds } from "@/lib/rehab/routine";
import { getRehabConditions } from "@/lib/rehab/server";
import { RehabPlayer } from "@/components/app/rehab/rehab-player";

export const dynamic = "force-dynamic";

/**
 * The rehab player. `?c=<condition id>` plays one condition's routine; with no query it
 * plays the combined, deduped routine for every condition the user has added.
 */
export default async function RehabPlayPage({ searchParams }: { searchParams: Promise<{ c?: string | string[] }> }) {
  const user = await requireAuth();
  const { c } = await searchParams;
  const requested = sanitizeConditionIds(Array.isArray(c) ? c : c ? [c] : []);
  const conditionIds = requested.length > 0 ? requested : await getRehabConditions(user.uid);
  const exercises = buildRoutine(conditionIds);
  if (exercises.length === 0) redirect("/member/rehab");

  const backHref = requested.length === 1 ? `/member/rehab/${requested[0]}` : "/member";
  return <RehabPlayer exercises={exercises} conditionIds={conditionIds} backHref={backHref} />;
}
