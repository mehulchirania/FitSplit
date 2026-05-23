import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";

/**
 * /owner/training/trainer/[trainerId] — convenience deep-link that redirects
 * to the main training hub pre-filtered on the given trainer.
 */
export default async function TrainerSchedulePage({
  params
}: {
  params: Promise<{ trainerId: string }>;
}) {
  await requireRole(["admin", "owner"]);
  const { trainerId } = await params;
  redirect(`/owner/training?trainerId=${trainerId}`);
}
