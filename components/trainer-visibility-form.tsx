"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { TrainerMemberVisibility } from "@/types/domain";
import { updateTrainerVisibilityAction } from "@/lib/firebase/actions";

const options: { value: TrainerMemberVisibility; label: string; description: string }[] = [
  {
    value: "assigned_only",
    label: "Assigned members only",
    description: "Trainers can only see PT members explicitly assigned to them.",
  },
  {
    value: "all_pt_members",
    label: "All PT members",
    description: "Trainers can see every member with a PT plan at this gym.",
  },
  {
    value: "all_members",
    label: "All members",
    description: "Trainers can see every member at this gym (maximum visibility).",
  },
];

interface TrainerVisibilityFormProps {
  gymId: string;
  current: TrainerMemberVisibility;
}

export function TrainerVisibilityForm({ gymId, current }: TrainerVisibilityFormProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleChange(e: React.ChangeEvent<HTMLFormElement>) {
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateTrainerVisibilityAction(gymId, { status: "idle", message: "" }, fd);
      if (result.status === "success") {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <div className="form-panel">
      <h2 className="panel-heading">Trainer visibility</h2>
      <p className="panel-description" style={{ marginBottom: 16 }}>
        Control which members each trainer can view in your gym.
      </p>
      <form onChange={handleChange}>
        <div className="visibility-option-list">
          {options.map((opt) => (
            <label key={opt.value} className={`visibility-option${current === opt.value ? " is-selected" : ""}`}>
              <input
                type="radio"
                name="trainerMemberVisibility"
                value={opt.value}
                defaultChecked={current === opt.value}
                disabled={isPending}
              />
              <div className="visibility-option-body">
                <span className="visibility-option-label">{opt.label}</span>
                <span className="visibility-option-desc">{opt.description}</span>
              </div>
            </label>
          ))}
        </div>
        {isPending && <p className="form-hint" style={{ marginTop: 8 }}>Saving…</p>}
      </form>
    </div>
  );
}
