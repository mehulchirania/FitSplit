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
          youtube: String(formData.get("youtube") ?? "")
        });
        setMessage({ type: "success", text: result.data.message });
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
