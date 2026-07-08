"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { toast } from "sonner";
import { logMeal } from "@/lib/firebase/actions";
import { initialFormActionState } from "@/types/action-state";
import type { MacroLog, MealLog, Member, MemberProfile } from "@/types/domain";
import { MacroProgressPanel } from "@/components/macro-progress-panel";
import { ProfileMetricsWidget } from "@/components/profile-metrics-widget";
import { EditableMetrics } from "@/components/editable-metrics";

interface MacrosScreenProps {
  memberId: string;
  gymId: string;
  todayDate: string;
  macroLog?: MacroLog | null;
  macroTarget?: MemberProfile["macroNutritionTarget"];
  macroLogs: MacroLog[];
  mealLogs: MealLog[];
  profile: MemberProfile;
  member: Member;
}

type QuickAddPreset = {
  name: string;
  items: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
};

const QUICK_ADD_PRESETS: QuickAddPreset[] = [
  { name: "Whey shake", items: "1 scoop whey + water", kcal: 130, protein: 25, carbs: 3, fat: 2 },
  { name: "3 eggs", items: "boiled", kcal: 210, protein: 18, carbs: 1, fat: 15 },
  { name: "Paneer bowl", items: "100g paneer + veggies", kcal: 320, protein: 20, carbs: 10, fat: 22 },
  { name: "Banana", items: "1 medium", kcal: 105, protein: 1, carbs: 27, fat: 0 },
  { name: "Chicken breast", items: "150g grilled", kcal: 250, protein: 46, carbs: 0, fat: 6 },
  { name: "PB toast", items: "2 slices + 1 tbsp peanut butter", kcal: 280, protein: 10, carbs: 32, fat: 12 },
];

const DEFAULT_TARGET = { calories: 2000, protein: 140, carbs: 240, fat: 70 };

function pct(value: number, goal: number) {
  if (!goal) return 0;
  return Math.min(100, Math.round((value / goal) * 100));
}

export function MacrosScreen({
  memberId,
  gymId,
  todayDate,
  macroLog,
  macroTarget,
  macroLogs,
  mealLogs,
  profile,
  member,
}: MacrosScreenProps) {
  const router = useRouter();
  const [pendingPreset, setPendingPreset] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", items: "", kcal: "", protein: "", carbs: "", fat: "" });

  const actual = macroLog ?? { protein: 0, carbs: 0, fat: 0, water: 0 };
  const totalKcal = Math.round(actual.protein * 4 + actual.carbs * 4 + actual.fat * 9);
  const kcalGoal = macroTarget?.calories ?? DEFAULT_TARGET.calories;
  const remaining = kcalGoal - totalKcal;
  const proteinGoal = macroTarget?.protein ?? DEFAULT_TARGET.protein;
  const carbsGoal = macroTarget?.carbs ?? DEFAULT_TARGET.carbs;
  const fatGoal = macroTarget?.fat ?? DEFAULT_TARGET.fat;

  const todayLabel = new Date(`${todayDate}T00:00:00`).toLocaleDateString("en-IN", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  async function submitMeal(payload: {
    name: string;
    items: string;
    kcal: number;
    protein: number;
    carbs: number;
    fat: number;
  }) {
    const formData = new FormData();
    formData.set("memberId", memberId);
    formData.set("date", todayDate);
    formData.set("name", payload.name);
    formData.set("items", payload.items);
    formData.set("kcal", String(payload.kcal));
    formData.set("protein", String(payload.protein));
    formData.set("carbs", String(payload.carbs));
    formData.set("fat", String(payload.fat));

    try {
      const result = await logMeal(initialFormActionState, formData);
      if (result.status === "success") {
        toast.success(`${payload.name} logged.`);
        router.refresh();
        return true;
      }
      toast.error(result.message || "Could not log this meal.");
      return false;
    } catch {
      toast.error("Could not log this meal. Check your connection and try again.");
      return false;
    }
  }

  async function handleQuickAdd(preset: QuickAddPreset) {
    if (pendingPreset) return;
    setPendingPreset(preset.name);
    await submitMeal(preset);
    setPendingPreset(null);
  }

  async function handleManualSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.name.trim()) {
      toast.error("Enter a meal name.");
      return;
    }
    setIsSubmitting(true);
    const ok = await submitMeal({
      name: form.name.trim(),
      items: form.items.trim(),
      kcal: Number(form.kcal || 0),
      protein: Number(form.protein || 0),
      carbs: Number(form.carbs || 0),
      fat: Number(form.fat || 0),
    });
    setIsSubmitting(false);
    if (ok) {
      setForm({ name: "", items: "", kcal: "", protein: "", carbs: "", fat: "" });
      setDialogOpen(false);
    }
  }

  const sortedMeals = [...mealLogs].sort((a, b) => new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime());

  return (
    <section className="m3d-mc">
      <div className="m3d-pagehead">
        <div>
          <span className="m3d-pagehead__eyebrow">Nutrition</span>
          <h1 className="m3d-pagehead__title">Macros</h1>
          <div className="m3d-mc__sub">
            {todayLabel}
            {profile.assignedTrainer ? ` · targets set by Coach ${profile.assignedTrainer}` : ""}
          </div>
        </div>
        <button type="button" className="m3d-mc__logbtn" onClick={() => setDialogOpen(true)}>
          + Log a meal
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        <div className="m3d-mc-hero">
          <div className="m3d-mc-hero__row">
            <span className="m3d-mc-hero__kcal">{totalKcal}</span>
            <span className="m3d-mc-hero__goal">/ {kcalGoal} kcal</span>
            <span className="m3d-mc-hero__remaining">
              {remaining >= 0 ? `${remaining} kcal remaining` : `${Math.abs(remaining)} kcal over`}
            </span>
          </div>
          <div className="m3d-mc-hero__bar">
            <div className="m3d-mc-hero__bar-fill" style={{ width: `${pct(totalKcal, kcalGoal)}%` }} />
          </div>
        </div>

        <div className="m3d-mc-macros">
          {([
            { key: "protein", label: "Protein", value: actual.protein, goal: proteinGoal },
            { key: "carbs", label: "Carbs", value: actual.carbs, goal: carbsGoal },
            { key: "fat", label: "Fat", value: actual.fat, goal: fatGoal },
          ] as const).map((m) => (
            <div key={m.key} className="m3d-mc-macro">
              <span className="m3d-mc-macro__label">{m.label}</span>
              <span className="m3d-mc-macro__value">
                {m.value}<small>/{m.goal}g</small>
              </span>
              <div className="m3d-mc-macro__bar">
                <div className={`m3d-mc-macro__bar-fill m3d-mc-macro__bar-fill--${m.key}`} style={{ width: `${pct(m.value, m.goal)}%` }} />
              </div>
            </div>
          ))}
        </div>

        <div>
          <div className="m3d-mc-section-label">QUICK ADD</div>
          <div className="m3d-mc-quickadd">
            {QUICK_ADD_PRESETS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                className="m3d-mc-pill"
                disabled={pendingPreset === preset.name}
                onClick={() => handleQuickAdd(preset)}
              >
                {pendingPreset === preset.name ? "Logging…" : `${preset.name} · ${preset.kcal} kcal`}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="m3d-mc-section-label">MEAL LOG · TODAY</div>
          {sortedMeals.length === 0 ? (
            <p className="mcr-empty-small">No meals logged yet today — use Quick Add or Log a meal above.</p>
          ) : (
            <div className="m3d-mc-meallog">
              {sortedMeals.map((meal) => (
                <div key={meal.id} className="m3d-mc-meal-row">
                  <span className="m3d-mc-meal-time">
                    {new Date(meal.loggedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <div className="m3d-mc-meal-body">
                    <span className="m3d-mc-meal-name">{meal.name}</span>
                    {meal.items && <span className="m3d-mc-meal-items">{meal.items}</span>}
                  </div>
                  <span className="m3d-mc-meal-kcal">{meal.kcal} kcal</span>
                  <span className="m3d-mc-meal-protein">{meal.protein}g P</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <MacroProgressPanel memberId={memberId} gymId={gymId} date={todayDate} target={macroTarget} initialActual={macroLog ?? undefined} macroHistory={macroLogs} />
        <ProfileMetricsWidget profile={profile} />
        <EditableMetrics member={{ ...member, ...profile }} />
      </div>

      <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="m3d-mc-dialog__overlay" />
          <Dialog.Content className="m3d-mc-dialog">
            <div className="m3d-mc-dialog__head">
              <Dialog.Title className="m3d-mc-dialog__title">Log a meal</Dialog.Title>
              <Dialog.Close asChild>
                <button type="button" aria-label="Close">×</button>
              </Dialog.Close>
            </div>
            <Dialog.Description className="m3d-mc-dialog__sub">
              Add a meal manually. This updates today&apos;s macro totals automatically.
            </Dialog.Description>

            <form onSubmit={handleManualSubmit} className="m3d-mc-dialog__form">
              <label className="m3d-mc-dialog__field">
                <span>Meal name</span>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Chicken rice bowl"
                />
              </label>
              <label className="m3d-mc-dialog__field">
                <span>Items (optional)</span>
                <input
                  type="text"
                  value={form.items}
                  onChange={(e) => setForm((f) => ({ ...f, items: e.target.value }))}
                  placeholder="e.g. 200g rice, 150g chicken, salad"
                />
              </label>
              <div className="m3d-mc-dialog__grid">
                <label className="m3d-mc-dialog__field">
                  <span>Calories</span>
                  <input type="number" min="0" step="1" value={form.kcal} onChange={(e) => setForm((f) => ({ ...f, kcal: e.target.value }))} />
                </label>
                <label className="m3d-mc-dialog__field">
                  <span>Protein (g)</span>
                  <input type="number" min="0" step="1" value={form.protein} onChange={(e) => setForm((f) => ({ ...f, protein: e.target.value }))} />
                </label>
                <label className="m3d-mc-dialog__field">
                  <span>Carbs (g)</span>
                  <input type="number" min="0" step="1" value={form.carbs} onChange={(e) => setForm((f) => ({ ...f, carbs: e.target.value }))} />
                </label>
                <label className="m3d-mc-dialog__field">
                  <span>Fat (g)</span>
                  <input type="number" min="0" step="1" value={form.fat} onChange={(e) => setForm((f) => ({ ...f, fat: e.target.value }))} />
                </label>
              </div>
              <div className="m3d-mc-dialog__actions">
                <Dialog.Close asChild>
                  <button type="button" className="m3d-btn-ghost m3d-btn-sm">Cancel</button>
                </Dialog.Close>
                <button type="submit" className="m3d-mc-dialog__submit" disabled={isSubmitting}>
                  {isSubmitting ? "Saving…" : "Log meal"}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}
