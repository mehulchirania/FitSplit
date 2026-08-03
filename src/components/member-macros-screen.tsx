"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { toast } from "sonner";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { logMeal, deleteMealLog, getMealQuickAddSuggestions, getBodyWeightHistory } from "@/lib/firebase/actions";
import { initialFormActionState } from "@/types/action-state";
import type { BodyMetricLog, MacroLog, MealLog, Member, MemberProfile } from "@/types/domain";
import type { MealSuggestion } from "@/lib/firebase/read-models/progress";
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

type MealPayload = {
  name: string;
  items?: string;
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

/** kcal is always derived from macros (4/4/9 kcal per gram) — never typed in directly. */
function deriveKcal(protein: number, carbs: number, fat: number) {
  return Math.round(protein * 4 + carbs * 4 + fat * 9);
}

function buildWeightTrend(logs: BodyMetricLog[]) {
  return [...logs]
    .sort((a, b) => a.loggedAt.localeCompare(b.loggedAt))
    .slice(-30)
    .map((log) => ({
      date: log.loggedAt.slice(5, 10),
      weight: log.weightKg,
    }));
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
  const [form, setForm] = useState({ name: "", items: "", protein: "", carbs: "", fat: "" });
  const [deletingMealId, setDeletingMealId] = useState<string | null>(null);
  const [repeatingYesterday, setRepeatingYesterday] = useState(false);
  const [quickSuggestions, setQuickSuggestions] = useState<{
    yesterdayMeals: MealLog[];
    recentMeals: MealSuggestion[];
  }>({ yesterdayMeals: [], recentMeals: [] });
  const [weightHistory, setWeightHistory] = useState<BodyMetricLog[]>([]);

  // Pulled directly by this client component (rather than threaded down as
  // props from the server-rendered page) so Quick Add gets "repeat
  // yesterday" / "recent meals" and the weight trend chart without needing
  // the page component to fetch and pass extra data. Both are thin "use
  // server" wrappers around read-models — see actions/progress.ts.
  useEffect(() => {
    let cancelled = false;
    getMealQuickAddSuggestions(memberId, gymId, todayDate)
      .then((data) => {
        if (!cancelled) setQuickSuggestions(data);
      })
      .catch(() => {
        // Non-fatal — quick add still works via the static presets below.
      });
    getBodyWeightHistory(memberId, gymId, 60)
      .then((data) => {
        if (!cancelled) setWeightHistory(data.logs);
      })
      .catch(() => {
        // Non-fatal — the trend card just stays hidden.
      });
    return () => {
      cancelled = true;
    };
  }, [memberId, gymId, todayDate]);

  const actual = macroLog ?? { protein: 0, carbs: 0, fat: 0, water: 0 };
  const totalKcal = deriveKcal(actual.protein, actual.carbs, actual.fat);
  const kcalGoal = macroTarget?.calories ?? DEFAULT_TARGET.calories;
  const remaining = kcalGoal - totalKcal;
  const proteinGoal = macroTarget?.protein ?? DEFAULT_TARGET.protein;
  const carbsGoal = macroTarget?.carbs ?? DEFAULT_TARGET.carbs;
  const fatGoal = macroTarget?.fat ?? DEFAULT_TARGET.fat;

  // todayDate is a plain "YYYY-MM-DD" (already computed server-side in IST).
  // Parsing it bare (no time component) anchors it at a deterministic UTC
  // instant that's identical on server and client; explicit timeZone below
  // then formats that instant back as the correct IST calendar day. Adding
  // a literal "T00:00:00" here (as this used to) forces *local time*
  // parsing instead, which resolves to a different underlying instant on a
  // UTC server than on an IST browser — the same class of hydration
  // mismatch as the un-timezoned toLocaleDateString calls elsewhere.
  const todayLabel = new Date(todayDate).toLocaleDateString("en-IN", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Kolkata",
  });

  async function submitMeal(payload: MealPayload, options: { silent?: boolean } = {}) {
    const formData = new FormData();
    formData.set("memberId", memberId);
    formData.set("date", todayDate);
    formData.set("name", payload.name);
    formData.set("items", payload.items ?? "");
    formData.set("kcal", String(payload.kcal));
    formData.set("protein", String(payload.protein));
    formData.set("carbs", String(payload.carbs));
    formData.set("fat", String(payload.fat));

    try {
      const result = await logMeal(initialFormActionState, formData);
      if (result.status === "success") {
        if (!options.silent) toast.success(`${payload.name} logged.`);
        router.refresh();
        return true;
      }
      if (!options.silent) toast.error(result.message || "Could not log this meal.");
      return false;
    } catch {
      if (!options.silent) toast.error("Could not log this meal. Check your connection and try again.");
      return false;
    }
  }

  async function handleQuickAdd(preset: MealPayload) {
    if (pendingPreset) return;
    setPendingPreset(preset.name);
    await submitMeal(preset);
    setPendingPreset(null);
  }

  async function handleRepeatYesterday() {
    if (repeatingYesterday || quickSuggestions.yesterdayMeals.length === 0) return;
    setRepeatingYesterday(true);
    let succeeded = 0;
    for (const meal of quickSuggestions.yesterdayMeals) {
      // Sequential so we can report an accurate count and avoid hammering the
      // macroLogs rollup doc with a burst of concurrent increments.
      const ok = await submitMeal(
        { name: meal.name, items: meal.items, kcal: meal.kcal, protein: meal.protein, carbs: meal.carbs, fat: meal.fat },
        { silent: true }
      );
      if (ok) succeeded += 1;
    }
    setRepeatingYesterday(false);
    if (succeeded > 0) {
      toast.success(`Re-logged ${succeeded} meal${succeeded === 1 ? "" : "s"} from yesterday.`);
    } else {
      toast.error("Could not repeat yesterday's meals. Check your connection and try again.");
    }
  }

  async function handleDeleteMeal(meal: MealLog) {
    if (deletingMealId) return;
    setDeletingMealId(meal.id);
    const formData = new FormData();
    formData.set("memberId", memberId);
    formData.set("mealId", meal.id);
    formData.set("date", todayDate);
    try {
      const result = await deleteMealLog(initialFormActionState, formData);
      if (result.status === "success") {
        toast.success(`${meal.name} removed.`);
        router.refresh();
      } else {
        toast.error(result.message || "Could not remove this meal.");
      }
    } catch {
      toast.error("Could not remove this meal. Check your connection and try again.");
    } finally {
      setDeletingMealId(null);
    }
  }

  async function handleManualSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.name.trim()) {
      toast.error("Enter a meal name.");
      return;
    }
    const protein = Number(form.protein || 0);
    const carbs = Number(form.carbs || 0);
    const fat = Number(form.fat || 0);
    setIsSubmitting(true);
    const ok = await submitMeal({
      name: form.name.trim(),
      items: form.items.trim(),
      kcal: deriveKcal(protein, carbs, fat),
      protein,
      carbs,
      fat,
    });
    setIsSubmitting(false);
    if (ok) {
      setForm({ name: "", items: "", protein: "", carbs: "", fat: "" });
      setDialogOpen(false);
    }
  }

  const sortedMeals = [...mealLogs].sort((a, b) => new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime());
  const recentNames = new Set(quickSuggestions.recentMeals.map((m) => m.name.toLowerCase()));
  const filteredPresets = QUICK_ADD_PRESETS.filter((preset) => !recentNames.has(preset.name.toLowerCase()));
  const dialogKcal = deriveKcal(Number(form.protein || 0), Number(form.carbs || 0), Number(form.fat || 0));
  const weightTrend = buildWeightTrend(weightHistory);

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
            {quickSuggestions.yesterdayMeals.length > 0 && (
              <button
                type="button"
                className="m3d-mc-pill m3d-mc-pill--repeat"
                disabled={repeatingYesterday}
                onClick={handleRepeatYesterday}
              >
                {repeatingYesterday
                  ? "Re-logging…"
                  : `↻ Repeat yesterday (${quickSuggestions.yesterdayMeals.length})`}
              </button>
            )}
            {quickSuggestions.recentMeals.map((meal) => (
              <button
                key={`recent-${meal.name}`}
                type="button"
                className="m3d-mc-pill"
                disabled={pendingPreset === meal.name}
                onClick={() => handleQuickAdd(meal)}
              >
                {pendingPreset === meal.name ? "Logging…" : `${meal.name} · ${meal.kcal} kcal`}
              </button>
            ))}
            {filteredPresets.map((preset) => (
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
                    {new Date(meal.loggedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" })}
                  </span>
                  <div className="m3d-mc-meal-body">
                    <span className="m3d-mc-meal-name">{meal.name}</span>
                    {meal.items && <span className="m3d-mc-meal-items">{meal.items}</span>}
                  </div>
                  <span className="m3d-mc-meal-kcal">{meal.kcal} kcal</span>
                  <span className="m3d-mc-meal-protein">{meal.protein}g P</span>
                  <button
                    type="button"
                    className="m3d-mc-meal-delete"
                    aria-label={`Remove ${meal.name}`}
                    disabled={deletingMealId === meal.id}
                    onClick={() => handleDeleteMeal(meal)}
                  >
                    {deletingMealId === meal.id ? "…" : "×"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {weightTrend.length > 1 && (
          <div>
            <div className="m3d-mc-section-label">WEIGHT TREND</div>
            <div className="m3d-mc-weighttrend">
              <ResponsiveContainer width="100%" height={120}>
                <AreaChart data={weightTrend} margin={{ top: 6, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="m3dWeightTrendFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--brand)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--text-faint)" }} axisLine={false} tickLine={false} />
                  <YAxis
                    domain={["dataMin - 1", "dataMax + 1"]}
                    tick={{ fontSize: 10, fill: "var(--text-faint)" }}
                    axisLine={false}
                    tickLine={false}
                    width={34}
                  />
                  <Tooltip
                    contentStyle={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 8, fontSize: "0.78rem" }}
                    labelStyle={{ color: "var(--text)", fontWeight: 700 }}
                    formatter={(value) => [`${value} kg`, "Weight"]}
                  />
                  <Area type="monotone" dataKey="weight" stroke="var(--brand)" strokeWidth={2} fill="url(#m3dWeightTrendFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

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
                  <span>Calories (auto)</span>
                  <div className="m3d-mc-dialog__computed">{dialogKcal} kcal</div>
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
