"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { saveRehabSession, setRehabFeeling } from "@/lib/firebase/actions/rehab";
import { REHAB_FEELINGS, type RehabFeeling } from "@/lib/rehab/session";
import { CheckIcon } from "../icons";
import { Sheet } from "../sheet";

export type RehabItem = {
  id: string;
  name: string;
  target: string;
  /** "2 × 30 sec each side" */
  dose: string;
  image?: string;
  /** First few cues only: the form, simplified. */
  steps: string[];
  stopIf: string;
  equipment?: string;
};

const storageKey = (day: string) => `fitsplit-rehab-${day}`;

/**
 * Today's rehab as a plain list. Tick what you've done; tap a row to see the form (picture,
 * three steps, when to stop). "Save to history" logs the ticked exercises once.
 */
export function RehabChecklist({
  items,
  conditionIds,
  dayKey,
  minutes
}: {
  items: RehabItem[];
  conditionIds: string[];
  dayKey: string;
  minutes: number;
}) {
  const [done, setDone] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const [save, setSave] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [feeling, setFeeling] = useState<RehabFeeling | null>(null);
  const [feelingError, setFeelingError] = useState(false);
  const [startedAt] = useState(() => Date.now());
  const runId = useRef<string>("");

  useEffect(() => {
    runId.current = crypto.randomUUID();
    try {
      const raw = window.localStorage.getItem(storageKey(dayKey));
      if (raw) {
        const ids = (JSON.parse(raw) as string[]).filter((id) => items.some((i) => i.id === id));
        setDone(new Set(ids));
      }
    } catch {
      /* storage unavailable */
    }
  }, [dayKey, items]);

  function toggle(id: string) {
    setSave("idle");
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        window.localStorage.setItem(storageKey(dayKey), JSON.stringify([...next]));
      } catch {
        /* storage unavailable */
      }
      return next;
    });
  }

  async function persist() {
    setSave("saving");
    const res = await saveRehabSession({
      runId: runId.current,
      conditionIds,
      startedAt: new Date(startedAt).toISOString(),
      durationSec: Math.max(60, Math.round((Date.now() - startedAt) / 1000)),
      exercisesCompleted: done.size,
      exercisesSkipped: items.length - done.size
    }).catch(() => ({ ok: false as const }));
    setSave(res.ok ? "saved" : "error");
  }

  async function answer(f: RehabFeeling) {
    setFeeling(f);
    setFeelingError(false);
    const res = await setRehabFeeling(runId.current, f).catch(() => ({ ok: false as const }));
    if (!res.ok) setFeelingError(true);
  }

  const open = useMemo(() => items.find((i) => i.id === openId) ?? null, [items, openId]);
  const [lastOpen, setLastOpen] = useState<RehabItem | null>(null);
  const sheetItem = open ?? lastOpen;

  return (
    <>
      <div className="fs-group fs-rehab-list">
        <ul className="fs-plain-list">
          {items.map((item) => {
            const isDone = done.has(item.id);
            return (
              <li key={item.id} className="fs-rehab-item" data-done={isDone}>
                <button
                  type="button"
                  className="fs-rehab-item__check"
                  role="checkbox"
                  aria-checked={isDone}
                  aria-label={`Mark ${item.name} done`}
                  onClick={() => toggle(item.id)}
                >
                  {isDone && <CheckIcon size={14} />}
                </button>
                <button
                  type="button"
                  className="fs-rehab-item__main"
                  onClick={() => {
                    setLastOpen(item);
                    setOpenId(item.id);
                  }}
                >
                  <span className="fs-row__title">{item.name}</span>
                  <span className="fs-row__sub fs-num">{item.dose}</span>
                </button>
              </li>
            );
          })}
        </ul>
        <div className="fs-rehab-list__foot">
          <span className="fs-soft fs-num" role="status">
            {save === "saved"
              ? "Saved to history"
              : save === "error"
                ? "Could not save. Try again."
                : `${done.size} of ${items.length} done · ~${minutes} min`}
          </span>
          {done.size > 0 && save !== "saved" && (
            <button type="button" className="fs-text-btn" disabled={save === "saving"} onClick={() => void persist()}>
              {save === "saving" ? "Saving…" : "Save to history"}
            </button>
          )}
        </div>
        {save === "saved" && (
          <div className="fs-rehab-feel" role="group" aria-label="How did it feel?">
            <p className="fs-rehab-feel__q">How did it feel?</p>
            <div className="fs-rehab-feel__opts">
              {REHAB_FEELINGS.map((f) => (
                <button
                  key={f}
                  type="button"
                  className="fs-rehab-feel__opt"
                  aria-pressed={feeling === f}
                  onClick={() => void answer(f)}
                >
                  {f === "better" ? "Better" : f === "same" ? "Same" : "Worse"}
                </button>
              ))}
            </div>
            {feelingError && <p className="fs-soft">Could not save that. Tap again to retry.</p>}
            {feeling === "worse" && (
              <p className="fs-rehab-feel__note" role="status">
                Thanks for telling us. If pain is persistent, sharp or spreads down a limb, or you feel numbness or tingling, see
                a physiotherapist or doctor. Stop any exercise that increases your pain.
              </p>
            )}
          </div>
        )}
      </div>

      <Sheet open={open !== null} onOpenChange={(o) => !o && setOpenId(null)} title={sheetItem?.name ?? ""}>
        {sheetItem && (
          <div className="fs-stack fs-stack--lg">
            {sheetItem.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="fs-rehab-form__img" src={sheetItem.image} alt={`${sheetItem.name} form`} loading="lazy" />
            )}
            <p className="fs-soft fs-num">
              {sheetItem.dose}
              {sheetItem.equipment ? ` · ${sheetItem.equipment}` : ""}
            </p>
            <ol className="fs-steps">
              {sheetItem.steps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
            <p className="fs-rp__stop">
              <strong>Stop if</strong> {sheetItem.stopIf.replace(/^Stop if /, "")}
            </p>
            <button
              type="button"
              className="fs-btn fs-btn--primary fs-btn--lg"
              onClick={() => {
                if (!done.has(sheetItem.id)) toggle(sheetItem.id);
                setOpenId(null);
              }}
            >
              {done.has(sheetItem.id) ? "Close" : "Mark done"}
            </button>
          </div>
        )}
      </Sheet>
    </>
  );
}
