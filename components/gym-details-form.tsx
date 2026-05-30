"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { FormEvent } from "react";
import { updateGymDetails } from "@/lib/firebase/actions";
import { callUpdateGymDetails } from "@/lib/firebase/functions";
import { initialFormActionState } from "@/types/action-state";

export function GymDetailsForm({
  gym
}: {
  gym: {
    id: string;
    name: string;
    location?: string;
    locationUrl?: string;
    phone?: string;
    email?: string;
    instagram?: string;
    linkedin?: string;
    youtube?: string;
    expiryWarningDays?: number;
    radiusMeters?: number;
    latitude?: number;
    longitude?: number;
    trainerMemberVisibility?: "assigned_only" | "all_pt_members" | "all_members";
  };
}) {
  const router = useRouter();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!event.currentTarget.reportValidity()) return;
    const formData = new FormData(event.currentTarget);
    setMessage(null);

    startTransition(async () => {
      try {
        const result = await callUpdateGymDetails({
          gymId: gym.id,
          name: String(formData.get("name") ?? ""),
          location: String(formData.get("location") ?? ""),
          locationUrl: String(formData.get("locationUrl") ?? ""),
          phone: String(formData.get("phone") ?? ""),
          email: String(formData.get("email") ?? ""),
          instagram: String(formData.get("instagram") ?? ""),
          linkedin: String(formData.get("linkedin") ?? ""),
          youtube: String(formData.get("youtube") ?? ""),
          expiryWarningDays: formData.get("expiryWarningDays") ? Number(formData.get("expiryWarningDays")) : undefined,
          radiusMeters: formData.get("radiusMeters") ? Number(formData.get("radiusMeters")) : undefined,
          latitude: formData.get("latitude") ? Number(formData.get("latitude")) : undefined,
          longitude: formData.get("longitude") ? Number(formData.get("longitude")) : undefined,
          trainerMemberVisibility: (formData.get("trainerMemberVisibility") as any) || undefined
        });
        setMessage({ type: "success", text: result.data?.message || "Gym details updated successfully." });
        router.refresh();
      } catch {
        const result = await updateGymDetails(initialFormActionState, formData);
        setMessage({ type: result.status === "success" ? "success" : "error", text: result.message });
        if (result.status === "success") router.refresh();
      }
    });
  }

  return (
    <form className="form-panel" onSubmit={submit}>
      <h2>Gym Details</h2>
      <input name="gymId" type="hidden" value={gym.id} />
      <div className="form-grid">
        <label>
          Gym Name
          <input name="name" defaultValue={gym.name} required />
        </label>
        <label>
          Location
          <input name="location" defaultValue={gym.location} placeholder="City, State" />
        </label>
        <label>
          Google Maps Location URL
          <input name="locationUrl" defaultValue={gym.locationUrl} placeholder="https://maps.google.com/..." type="url" />
        </label>
        <label>
          Contact Phone
          <input name="phone" defaultValue={gym.phone} />
        </label>
        <label>
          Contact Email
          <input name="email" defaultValue={gym.email} type="email" />
        </label>
      </div>
      <h3 style={{ marginTop: "24px", marginBottom: "12px", fontSize: "0.9rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-soft)" }}>Social Profiles</h3>
      <div className="form-grid">
        <label>
          Instagram
          <input name="instagram" defaultValue={gym.instagram} placeholder="@username" />
        </label>
        <label>
          LinkedIn
          <input name="linkedin" defaultValue={gym.linkedin} placeholder="company URL" />
        </label>
        <label>
          YouTube
          <input name="youtube" defaultValue={gym.youtube} placeholder="channel URL" />
        </label>
      </div>
      <h3 style={{ marginTop: "24px", marginBottom: "12px", fontSize: "0.9rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-soft)" }}>Advanced Settings</h3>
      <div className="form-grid">
        <label>
          Trainer Member Visibility
          <select name="trainerMemberVisibility" defaultValue={gym.trainerMemberVisibility}>
            <option value="assigned_only">Assigned Only (Default)</option>
            <option value="all_pt_members">All PT Members</option>
            <option value="all_members">All Members</option>
          </select>
        </label>
        <label>
          Expiry Warning Days
          <input name="expiryWarningDays" type="number" defaultValue={gym.expiryWarningDays} />
        </label>
        <label>
          Geofence Radius (Meters)
          <input name="radiusMeters" type="number" defaultValue={gym.radiusMeters} />
        </label>
        <label>
          Latitude
          <input name="latitude" type="number" step="any" defaultValue={gym.latitude} />
        </label>
        <label>
          Longitude
          <input name="longitude" type="number" step="any" defaultValue={gym.longitude} />
        </label>
      </div>
      {message ? (
        <p className={`form-message form-message-${message.type}`} role={message.type === "error" ? "alert" : "status"}>
          {message.text}
        </p>
      ) : null}
      <button className="button button-primary" disabled={isPending} type="submit">
        {isPending ? "Saving..." : "Save Details"}
      </button>
    </form>
  );
}
