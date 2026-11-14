"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PinField } from "@/components/phone-pin-fields";
import { changePin, logoutUser } from "@/lib/auth";
import { deleteMyAccount, exportMyData, updateProfileMetrics } from "@/lib/firebase/actions";
import { initialFormActionState } from "@/types/action-state";
import { formatPhone } from "@/lib/phone-identity";
import type { ProfileMetrics, UserProfile } from "@/types/domain";
import { ChevronRight } from "./icons";
import { Sheet } from "./sheet";

function initialsOf(name: string) {
  return (
    name
      .split(/\s+/)
      .map((w) => w[0])
      .filter(Boolean)
      .join("")
      .slice(0, 2)
      .toUpperCase() || "FS"
  );
}

export function ProfileScreen({ member, profile }: { member: UserProfile; profile: ProfileMetrics }) {
  const router = useRouter();
  const [sheet, setSheet] = useState<null | "edit" | "pin" | "delete">(null);
  const [pending, startTransition] = useTransition();
  const [exporting, setExporting] = useState(false);

  // edit form
  const [fullName, setFullName] = useState(member.fullName);
  const [age, setAge] = useState(profile.age?.toString() ?? "");
  const [weightKg, setWeightKg] = useState(profile.weightKg?.toString() ?? "");
  const [heightCm, setHeightCm] = useState(profile.heightCm?.toString() ?? "");
  const [goals, setGoals] = useState(profile.fitnessGoals ?? "");
  const [editError, setEditError] = useState("");

  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmNewPin, setConfirmNewPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [delState, delAction, delPending] = useActionState(deleteMyAccount, initialFormActionState);

  function submitPin(e: React.FormEvent) {
    e.preventDefault();
    setPinError("");
    const fd = new FormData();
    fd.set("currentPin", currentPin);
    fd.set("newPin", newPin);
    fd.set("confirmPin", confirmNewPin);
    startTransition(async () => {
      const res = await changePin(initialFormActionState, fd);
      if (res.status === "success") {
        toast.success(res.message);
        setCurrentPin("");
        setNewPin("");
        setConfirmNewPin("");
        setSheet(null);
      } else {
        setPinError(res.message);
      }
    });
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    setEditError("");
    const fd = new FormData();
    fd.set("fullName", fullName.trim() || member.fullName);
    if (age) fd.set("age", age);
    if (weightKg) fd.set("weightKg", weightKg);
    if (heightCm) fd.set("heightCm", heightCm);
    fd.set("fitnessGoals", goals.trim());
    startTransition(async () => {
      const res = await updateProfileMetrics(initialFormActionState, fd);
      if (res.status === "success") {
        setSheet(null);
        toast.success("Profile saved");
        router.refresh();
      } else {
        setEditError(res.message);
      }
    });
  }

  async function exportData() {
    setExporting(true);
    try {
      const res = await exportMyData();
      if (res.status === "success") {
        const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = res.filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        toast.success("Your data download has started");
      } else {
        toast.error(res.message);
      }
    } catch {
      toast.error("Could not export right now. Please try again.");
    } finally {
      setExporting(false);
    }
  }

  const value = (v: string | number | undefined, unit = "") => (v ? `${v}${unit}` : "Not set");

  return (
    <>
      <div className="fs-profile-head">
        {member.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="fs-avatar" src={member.avatarUrl} alt="" />
        ) : (
          <span className="fs-avatar" aria-hidden="true">
            {initialsOf(member.fullName)}
          </span>
        )}
        <div>
          <p className="fs-profile-head__name">{member.fullName}</p>
          {member.phone && <p className="fs-soft fs-num">{formatPhone(member.phone)}</p>}
        </div>
      </div>

      <section className="fs-section">
        <div className="fs-group">
          <Link href="/member/progress" className="fs-row fs-row--tap">
            <span className="fs-row__main">
              <span className="fs-row__title">Progress</span>
              <span className="fs-row__sub">Workout history and personal bests</span>
            </span>
            <ChevronRight size={18} className="fs-row__chev" />
          </Link>
          <Link href="/member/rehab" className="fs-row fs-row--tap">
            <span className="fs-row__main">
              <span className="fs-row__title">Rehab &amp; mobility</span>
              <span className="fs-row__sub">Routines for back, neck, hips and more</span>
            </span>
            <ChevronRight size={18} className="fs-row__chev" />
          </Link>
        </div>
      </section>

      <section className="fs-section">
        <h2 className="fs-section__title">About you</h2>
        <div className="fs-group">
          <div className="fs-row">
            <span className="fs-row__title">Weight</span>
            <span className="fs-row__value fs-num">{value(profile.weightKg, " kg")}</span>
          </div>
          <div className="fs-row">
            <span className="fs-row__title">Height</span>
            <span className="fs-row__value fs-num">{value(profile.heightCm, " cm")}</span>
          </div>
          <div className="fs-row">
            <span className="fs-row__title">Age</span>
            <span className="fs-row__value fs-num">{value(profile.age)}</span>
          </div>
          <div className="fs-row">
            <span className="fs-row__title">Goal</span>
            <span className="fs-row__value">{profile.fitnessGoals || "Not set"}</span>
          </div>
          <button type="button" className="fs-row fs-row--tap fs-row--action" onClick={() => setSheet("edit")}>
            <span className="fs-row__title fs-row__title--brand">Edit details</span>
          </button>
        </div>
      </section>

      <section className="fs-section">
        <h2 className="fs-section__title">Account</h2>
        <div className="fs-group">
          <button type="button" className="fs-row fs-row--tap" onClick={() => setSheet("pin")}>
            <span className="fs-row__title">Change PIN</span>
            <ChevronRight size={18} className="fs-row__chev" />
          </button>
          <Link href="/privacy" className="fs-row fs-row--tap">
            <span className="fs-row__title">Privacy policy</span>
            <ChevronRight size={18} className="fs-row__chev" />
          </Link>
          <Link href="/terms" className="fs-row fs-row--tap">
            <span className="fs-row__title">Terms of service</span>
            <ChevronRight size={18} className="fs-row__chev" />
          </Link>
          <button type="button" className="fs-row fs-row--tap" disabled={exporting} onClick={() => void exportData()}>
            <span className="fs-row__main">
              <span className="fs-row__title">Download my data</span>
              <span className="fs-row__sub">{exporting ? "Preparing…" : "A copy of everything FitSplit holds, as JSON"}</span>
            </span>
          </button>
        </div>
      </section>

      <section className="fs-section">
        <div className="fs-group">
          <button
            type="button"
            className="fs-row fs-row--tap fs-row--action"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await logoutUser();
              })
            }
          >
            <span className="fs-row__title fs-row__title--brand">{pending ? "Logging out…" : "Log out"}</span>
          </button>
          <button type="button" className="fs-row fs-row--tap fs-row--action" onClick={() => setSheet("delete")}>
            <span className="fs-row__title fs-row__title--danger">Delete account</span>
          </button>
        </div>
      </section>

      <Sheet open={sheet === "edit"} onOpenChange={(o) => !o && setSheet(null)} title="Edit details">
        <form className="fs-stack fs-stack--lg" onSubmit={save}>
          <div className="fs-group">
            <label className="fs-field fs-field--labelled">
              <span>Name</span>
              <input className="fs-input" value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" />
            </label>
            <label className="fs-field fs-field--labelled">
              <span>Weight (kg)</span>
              <input className="fs-input fs-num" inputMode="decimal" placeholder="e.g. 72" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} />
            </label>
            <label className="fs-field fs-field--labelled">
              <span>Height (cm)</span>
              <input className="fs-input fs-num" inputMode="numeric" placeholder="e.g. 175" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} />
            </label>
            <label className="fs-field fs-field--labelled">
              <span>Age</span>
              <input className="fs-input fs-num" inputMode="numeric" placeholder="e.g. 28" value={age} onChange={(e) => setAge(e.target.value)} />
            </label>
            <label className="fs-field fs-field--labelled">
              <span>Goal</span>
              <input className="fs-input" placeholder="e.g. Build muscle" value={goals} onChange={(e) => setGoals(e.target.value)} />
            </label>
          </div>
          {editError && <p className="fs-error">{editError}</p>}
          <button type="submit" className="fs-btn fs-btn--primary fs-btn--lg" disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </button>
        </form>
      </Sheet>

      <Sheet open={sheet === "pin"} onOpenChange={(o) => !o && setSheet(null)} title="Change PIN">
        <form className="fs-stack fs-stack--lg" onSubmit={submitPin}>
          <div className="fs-stack">
            <span className="fs-soft">Current PIN</span>
            <PinField label="Current PIN" value={currentPin} onChange={setCurrentPin} />
            <span className="fs-soft">New PIN</span>
            <PinField label="New PIN" value={newPin} onChange={setNewPin} />
            <span className="fs-soft">Confirm new PIN</span>
            <PinField label="Confirm new PIN" value={confirmNewPin} onChange={setConfirmNewPin} />
          </div>
          {pinError && <p className="fs-error">{pinError}</p>}
          <button type="submit" className="fs-btn fs-btn--primary fs-btn--lg" disabled={pending}>
            {pending ? "Updating…" : "Update PIN"}
          </button>
        </form>
      </Sheet>

      <Sheet open={sheet === "delete"} onOpenChange={(o) => !o && setSheet(null)} title="Delete account?">
        <form className="fs-stack fs-stack--lg" action={delAction}>
          <p>This permanently erases your account, plans, workouts and profile. It cannot be undone.</p>
          {delState.status === "error" && <p className="fs-error">{delState.message}</p>}
          <button type="submit" className="fs-btn fs-btn--danger fs-btn--lg" disabled={delPending}>
            {delPending ? "Deleting…" : "Delete everything"}
          </button>
          <button type="button" className="fs-btn fs-btn--secondary fs-btn--lg" onClick={() => setSheet(null)}>
            Cancel
          </button>
        </form>
      </Sheet>
    </>
  );
}
