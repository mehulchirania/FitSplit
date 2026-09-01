/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { updateMarketplaceListing } from "@/lib/firebase/actions";
import { initialFormActionState } from "@/types/action-state";
import type { FormActionState } from "@/types/action-state";

type ImageState = { src: string };

export function GymMarketplaceForm({
  gymId,
  gymName,
  isPubliclyListed,
  description,
  city,
  coverImageUrl
}: {
  gymId: string;
  gymName: string;
  isPubliclyListed: boolean;
  description?: string;
  city?: string;
  coverImageUrl?: string;
}) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [listed, setListed] = useState(isPubliclyListed);
  const [image, setImage] = useState<ImageState | null>(null);
  const [coverDataUrl, setCoverDataUrl] = useState("");
  const [status, setStatus] = useState<FormActionState | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!image) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      // Fixed 1200x630 marketplace cover ratio, cropped to cover.
      const width = 1200;
      const height = 630;
      canvas.width = width;
      canvas.height = height;
      const scale = Math.max(width / img.width, height / img.height);
      const drawWidth = img.width * scale;
      const drawHeight = img.height * scale;
      const x = (width - drawWidth) / 2;
      const y = (height - drawHeight) / 2;
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, x, y, drawWidth, drawHeight);
      setCoverDataUrl(canvas.toDataURL("image/png"));
    };
    img.src = image.src;
  }, [image]);

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setStatus(null);
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setStatus({ status: "error", message: "Choose an image file." });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImage({ src: String(reader.result ?? "") });
    reader.readAsDataURL(file);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("isPubliclyListed", listed ? "true" : "false");
    if (coverDataUrl) formData.set("coverImageDataUrl", coverDataUrl);

    startTransition(async () => {
      const result = await updateMarketplaceListing(initialFormActionState, formData);
      setStatus(result);
      if (result.status === "success") router.refresh();
    });
  }

  return (
    <form className="form-panel marketplace-form" onSubmit={handleSubmit}>
      <div className="panel-title">
        <div>
          <h2>Marketplace listing</h2>
          <p className="member-meta">
            List {gymName} on the public FitSplit marketplace so nearby members can discover it and request to join.
          </p>
        </div>
      </div>

      <input name="gymId" type="hidden" value={gymId} />

      <label className="marketplace-toggle">
        <input
          checked={listed}
          onChange={(event) => setListed(event.target.checked)}
          type="checkbox"
        />
        <span>List my gym on the FitSplit marketplace</span>
      </label>

      {listed && (
        <>
          <div className="form-grid">
            <label>
              City
              <input defaultValue={city} name="city" placeholder="e.g. Coimbatore" required={listed} />
            </label>
          </div>

          <label>
            Description
            <textarea
              defaultValue={description}
              maxLength={400}
              name="description"
              placeholder="What makes your gym worth joining — equipment, coaching style, vibe."
              required={listed}
              rows={4}
            />
          </label>

          <div className="marketplace-cover">
            <div className="marketplace-cover-preview">
              {coverDataUrl ? (
                <img alt={`${gymName} cover preview`} src={coverDataUrl} />
              ) : coverImageUrl ? (
                <img alt={`${gymName} current cover`} src={coverImageUrl} />
              ) : (
                <span className="marketplace-cover-placeholder">No cover image yet</span>
              )}
            </div>
            <label>
              Upload cover image (optional)
              <input accept="image/*" onChange={handleFile} type="file" />
            </label>
            <canvas hidden ref={canvasRef} />
          </div>
        </>
      )}

      {status && (
        <p className={`form-message form-message-${status.status}`} role={status.status === "error" ? "alert" : "status"}>
          {status.message}
        </p>
      )}

      <button className="button button-primary" disabled={isPending} type="submit">
        {isPending ? "Saving..." : "Save marketplace listing"}
      </button>
    </form>
  );
}
