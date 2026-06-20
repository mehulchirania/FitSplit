/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { initialFormActionState } from "@/types/action-state";
import type { FormActionState } from "@/types/action-state";

type ImageState = { src: string; width: number; height: number };

/**
 * Reusable circular avatar uploader. Crops the chosen image to a square PNG
 * data URL client-side, then submits it through a server action that uploads to
 * Firebase Storage. Used for both member avatars (`updateMemberAvatar`) and
 * staff images (`updateStaffImage`).
 */
export function AvatarUploader({
  action,
  currentUrl,
  name,
  dataUrlField,
  fields
}: {
  /** Server action: (prevState, formData) => FormActionState. */
  action: (previousState: FormActionState, formData: FormData) => Promise<FormActionState>;
  /** Current avatar download URL, if any. */
  currentUrl?: string;
  /** Display name — drives the initials fallback. */
  name: string;
  /** FormData field name carrying the cropped PNG data URL (e.g. "avatarDataUrl"). */
  dataUrlField: string;
  /** Extra hidden form fields (e.g. { memberId } or { userId, gymId }). */
  fields: Record<string, string>;
}) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [image, setImage] = useState<ImageState | null>(null);
  const [zoom, setZoom] = useState(1);
  const [dataUrl, setDataUrl] = useState("");
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<FormActionState | null>(null);
  const [isPending, startTransition] = useTransition();

  const initials = name.split(" ").map((p) => p[0]).filter(Boolean).join("").slice(0, 2).toUpperCase() || "?";

  function drawPreview(img: HTMLImageElement) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = 320;
    canvas.width = size;
    canvas.height = size;
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = "#0A0A0A";
    ctx.fillRect(0, 0, size, size);

    const coverScale = Math.max(size / img.width, size / img.height) * zoom;
    const drawWidth = img.width * coverScale;
    const drawHeight = img.height * coverScale;
    const x = (size - drawWidth) / 2;
    const y = (size - drawHeight) / 2;
    ctx.drawImage(img, x, y, drawWidth, drawHeight);
    setDataUrl(canvas.toDataURL("image/png"));
  }

  useEffect(() => {
    if (!image) return;
    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      drawPreview(img);
    };
    img.src = image.src;
  }, [image]);

  useEffect(() => {
    if (imageRef.current) drawPreview(imageRef.current);
  }, [zoom]);

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setStatus(null);
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setStatus({ status: "error", message: "Choose an image file." });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const src = String(reader.result ?? "");
      const img = new Image();
      img.onload = () => {
        setImage({ src, width: img.width, height: img.height });
        setZoom(1);
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dataUrl) {
      setStatus({ status: "error", message: "Choose and preview a photo first." });
      return;
    }
    const formData = new FormData();
    Object.entries(fields).forEach(([key, value]) => formData.set(key, value));
    formData.set(dataUrlField, dataUrl);
    startTransition(async () => {
      const result = await action(initialFormActionState, formData);
      setStatus(result);
      if (result.status === "success") {
        setOpen(false);
        setImage(null);
        setDataUrl("");
        router.refresh();
      }
    });
  }

  return (
    <div className="avatar-uploader">
      <button
        type="button"
        className="avatar-uploader__trigger"
        onClick={() => setOpen((v) => !v)}
        aria-label="Change profile photo"
      >
        {currentUrl ? (
          <img className="avatar-uploader__img" src={currentUrl} alt={`${name} avatar`} />
        ) : (
          <span className="avatar-uploader__initials">{initials}</span>
        )}
        <span className="avatar-uploader__edit" aria-hidden="true">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
        </span>
      </button>

      {open && (
        <form className="avatar-uploader__panel" onSubmit={handleSubmit}>
          <div className="avatar-uploader__editor">
            {image ? (
              <canvas ref={canvasRef} className="avatar-uploader__canvas" aria-label="Avatar crop preview" />
            ) : (
              <div className="avatar-uploader__empty">Upload a square-ish photo for the best result.</div>
            )}
          </div>

          <label className="avatar-uploader__file">
            {image ? "Choose a different photo" : "Choose photo"}
            <input accept="image/*" type="file" onChange={handleFile} />
          </label>

          {image && (
            <label className="avatar-uploader__zoom">
              Zoom
              <input
                type="range"
                min="1"
                max="3"
                step="0.05"
                value={zoom}
                onChange={(event) => setZoom(Number(event.target.value))}
              />
            </label>
          )}

          {status && (
            <p className={`avatar-uploader__msg avatar-uploader__msg--${status.status}`} role={status.status === "error" ? "alert" : "status"}>
              {status.message}
            </p>
          )}

          <div className="avatar-uploader__actions">
            <button className="avatar-uploader__save" type="submit" disabled={isPending || !dataUrl}>
              {isPending ? "Saving…" : "Save photo"}
            </button>
            <button className="avatar-uploader__cancel" type="button" onClick={() => { setOpen(false); setImage(null); setStatus(null); }}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
