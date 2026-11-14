"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { skipDay, undoSkipDay } from "@/lib/firebase/actions/programs";

/** Quiet "Skip today": moves the plan on without logging a workout. Undo lives in the toast. */
export function SkipDay({ programId, dayId, nextTitle }: { programId: string; dayId: string; nextTitle: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function skip() {
    start(async () => {
      const res = await skipDay(programId, dayId);
      if (!res.ok || !res.id) {
        toast.error(res.ok ? "Could not skip today." : res.message);
        return;
      }
      const id = res.id;
      router.refresh();
      toast(`Skipped. Next up: ${nextTitle}`, {
        duration: 8000,
        action: {
          label: "Undo",
          onClick: () => {
            void undoSkipDay(id).then((r) => {
              if (!r.ok) toast.error(r.message);
              router.refresh();
            });
          }
        }
      });
    });
  }

  return (
    <button type="button" className="fs-text-btn fs-text-btn--quiet" onClick={skip} disabled={pending}>
      {pending ? "Skipping…" : "Skip today"}
    </button>
  );
}
