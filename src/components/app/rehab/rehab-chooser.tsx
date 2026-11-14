"use client";

import { useState } from "react";
import { toast } from "sonner";
import { setRehabCondition } from "@/lib/firebase/actions/rehab";

type Option = { id: string; name: string; forWho: string };

/** First-run, optional: pick anything to add rehab to the daily workout. Saved per tap. */
export function RehabChooser({ options, initial }: { options: Option[]; initial: string[] }) {
  const [on, setOn] = useState<Set<string>>(new Set(initial));

  async function flip(id: string) {
    const next = !on.has(id);
    setOn((prev) => {
      const s = new Set(prev);
      if (next) s.add(id);
      else s.delete(id);
      return s;
    });
    const res = await setRehabCondition(id, next).catch(() => ({ ok: false as const, message: "Could not save that." }));
    if (!res.ok) {
      setOn((prev) => {
        const s = new Set(prev);
        if (next) s.delete(id);
        else s.add(id);
        return s;
      });
      toast.error(res.message);
    }
  }

  return (
    <div className="fs-group fs-rehab-choose">
      {options.map((o) => (
        <button key={o.id} type="button" role="switch" aria-checked={on.has(o.id)} className="fs-row fs-row--tap" onClick={() => void flip(o.id)}>
          <span className="fs-row__main">
            <span className="fs-row__title">{o.name}</span>
            <span className="fs-row__sub">{o.forWho}</span>
          </span>
          <span className="fs-switch" data-on={on.has(o.id)} aria-hidden="true">
            <span />
          </span>
        </button>
      ))}
    </div>
  );
}
