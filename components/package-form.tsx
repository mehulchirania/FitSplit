"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { Package } from "@/types/domain";
import { savePackage } from "@/lib/firebase/actions";

interface PackageFormProps {
  gymId: string;
  pkg?: Package;
  onDone?: () => void;
}

const blank = {
  name: "",
  description: "",
  durationMonths: "1",
  price: "",
  currency: "INR",
  includesPT: false,
  ptSessionsIncluded: "",
};

export function PackageForm({ gymId, pkg, onDone }: PackageFormProps) {
  const isEdit = Boolean(pkg);
  const [isPending, startTransition] = useTransition();

  const [form, setForm] = useState({
    name: pkg?.name ?? blank.name,
    description: pkg?.description ?? blank.description,
    durationMonths: String(pkg?.durationMonths ?? blank.durationMonths),
    price: String(pkg?.price ?? blank.price),
    currency: pkg?.currency ?? blank.currency,
    includesPT: pkg?.includesPT ?? blank.includesPT,
    ptSessionsIncluded: String(pkg?.ptSessionsIncluded ?? blank.ptSessionsIncluded),
  });

  function set(key: keyof typeof form, value: string | boolean) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (isEdit && pkg) fd.set("packageId", pkg.id);
    startTransition(async () => {
      const result = await savePackage(gymId, { status: "idle", message: "" }, fd);
      if (result.status === "success") {
        toast.success(result.message);
        onDone?.();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <form className="package-form" onSubmit={handleSubmit}>
      <div className="form-row">
        <label className="form-label" htmlFor="pkg-name">Package name *</label>
        <input
          id="pkg-name"
          name="name"
          className="input"
          required
          placeholder="e.g. Monthly Standard"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          disabled={isPending}
        />
      </div>

      <div className="form-row">
        <label className="form-label" htmlFor="pkg-desc">Description</label>
        <textarea
          id="pkg-desc"
          name="description"
          className="input"
          rows={2}
          placeholder="Optional short description"
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          disabled={isPending}
        />
      </div>

      <div className="form-row-2col">
        <div className="form-row">
          <label className="form-label" htmlFor="pkg-duration">Duration (months) *</label>
          <input
            id="pkg-duration"
            name="durationMonths"
            className="input"
            type="number"
            min={1}
            max={24}
            required
            value={form.durationMonths}
            onChange={(e) => set("durationMonths", e.target.value)}
            disabled={isPending}
          />
        </div>
        <div className="form-row">
          <label className="form-label" htmlFor="pkg-price">Price *</label>
          <div className="input-prefix-group">
            <select
              name="currency"
              className="input input-prefix-select"
              value={form.currency}
              onChange={(e) => set("currency", e.target.value)}
              disabled={isPending}
            >
              <option value="INR">₹ INR</option>
              <option value="USD">$ USD</option>
              <option value="EUR">€ EUR</option>
            </select>
            <input
              id="pkg-price"
              name="price"
              className="input input-prefix-main"
              type="number"
              min={0}
              step={1}
              required
              placeholder="0"
              value={form.price}
              onChange={(e) => set("price", e.target.value)}
              disabled={isPending}
            />
          </div>
        </div>
      </div>

      <div className="form-row">
        <label className="form-checkbox-row">
          <input
            type="checkbox"
            name="includesPT"
            value="true"
            checked={form.includesPT}
            onChange={(e) => set("includesPT", e.target.checked)}
            disabled={isPending}
          />
          <span>Includes personal training sessions</span>
        </label>
      </div>

      {form.includesPT && (
        <div className="form-row">
          <label className="form-label" htmlFor="pkg-pt-sessions">PT sessions included</label>
          <input
            id="pkg-pt-sessions"
            name="ptSessionsIncluded"
            className="input"
            type="number"
            min={0}
            placeholder="e.g. 8"
            value={form.ptSessionsIncluded}
            onChange={(e) => set("ptSessionsIncluded", e.target.value)}
            disabled={isPending}
          />
        </div>
      )}

      <div className="form-actions">
        {onDone && (
          <button
            type="button"
            className="button button-ghost"
            onClick={onDone}
            disabled={isPending}
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          className="button button-primary"
          disabled={isPending}
        >
          {isPending ? "Saving…" : isEdit ? "Save changes" : "Create package"}
        </button>
      </div>
    </form>
  );
}
