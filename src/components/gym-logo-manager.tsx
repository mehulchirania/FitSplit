/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { initialFormActionState } from "@/types/action-state";
import type { FormActionState } from "@/types/action-state";

type ImageState = {
  height: number;
  src: string;
  width: number;
};

export function GymLogoManager({
  action,
  currentLogoUrl,
  gymId,
  gymName
}: {
  action: (previousState: FormActionState, formData: FormData) => Promise<FormActionState>;
  currentLogoUrl?: string;
  gymId: string;
  gymName: string;
}) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [image, setImage] = useState<ImageState | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [logoDataUrl, setLogoDataUrl] = useState("");
  const [status, setStatus] = useState<FormActionState | null>(null);
  const [isPending, startTransition] = useTransition();

  function drawPreview(img: HTMLImageElement) {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = 512;
    canvas.width = size;
    canvas.height = size;
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = "#0A0A0A";
    ctx.fillRect(0, 0, size, size);

    const coverScale = Math.max(size / img.width, size / img.height) * zoom;
    const drawWidth = img.width * coverScale;
    const drawHeight = img.height * coverScale;
    const maxOffsetX = Math.max(0, (drawWidth - size) / 2);
    const maxOffsetY = Math.max(0, (drawHeight - size) / 2);
    const safeOffsetX = (offsetX / 100) * maxOffsetX;
    const safeOffsetY = (offsetY / 100) * maxOffsetY;
    const x = (size - drawWidth) / 2 + safeOffsetX;
    const y = (size - drawHeight) / 2 + safeOffsetY;

    ctx.drawImage(img, x, y, drawWidth, drawHeight);
    setLogoDataUrl(canvas.toDataURL("image/png"));
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
    if (imageRef.current) {
      drawPreview(imageRef.current);
    }
  }, [zoom, offsetX, offsetY]);

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
        setImage({ height: img.height, src, width: img.width });
        setZoom(1);
        setOffsetX(0);
        setOffsetY(0);
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!logoDataUrl) {
      setStatus({ status: "error", message: "Choose and preview a logo first." });
      return;
    }

    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await action(initialFormActionState, formData);
      setStatus(result);
      if (result.status === "success") router.refresh();
    });
  }

  return (
    <form className="form-panel gym-logo-manager" onSubmit={handleSubmit}>
      <div className="panel-title">
        <div>
          <h2>Gym Logo</h2>
          <p className="member-meta">
            Crop a square logo for the member top bar and gym workspace branding.
          </p>
        </div>
      </div>

      <input name="gymId" type="hidden" value={gymId} />
      <input name="logoDataUrl" type="hidden" value={logoDataUrl} />

      <div className="gym-logo-current">
        <div className="gym-brand-preview">
          <img alt="FitSplit logo" src="/new_logo.png" />
          <span>x</span>
          {logoDataUrl ? (
            <img alt={`${gymName} cropped preview`} src={logoDataUrl} />
          ) : currentLogoUrl ? (
            <img alt={`${gymName} current logo`} src={currentLogoUrl} />
          ) : (
            <span className="gym-logo-placeholder">{gymName.slice(0, 2).toUpperCase()}</span>
          )}
        </div>
      </div>

      <label>
        Upload logo
        <input accept="image/*" onChange={handleFile} type="file" />
      </label>

      <div className="gym-logo-editor">
        <canvas aria-label="Logo crop preview" className="gym-logo-canvas" ref={canvasRef} />
        {!image && (
          <div className="gym-logo-empty">
            {currentLogoUrl ? "Upload a new image to crop and replace the logo." : "Upload a logo to start cropping."}
          </div>
        )}
      </div>

      {image && (
        <div className="gym-logo-controls">
          <label>
            Resize
            <input
              max="2"
              min="0.7"
              onChange={(event) => setZoom(Number(event.target.value))}
              step="0.05"
              type="range"
              value={zoom}
            />
          </label>
          <label>
            Move horizontally
            <input
              max="100"
              min="-100"
              onChange={(event) => setOffsetX(Number(event.target.value))}
              step="1"
              type="range"
              value={offsetX}
            />
          </label>
          <label>
            Move vertically
            <input
              max="100"
              min="-100"
              onChange={(event) => setOffsetY(Number(event.target.value))}
              step="1"
              type="range"
              value={offsetY}
            />
          </label>
        </div>
      )}

      {status && (
        <p className={`form-message form-message-${status.status}`} role={status.status === "error" ? "alert" : "status"}>
          {status.message}
        </p>
      )}

      <button className="button button-primary" disabled={isPending || !logoDataUrl} type="submit">
        {isPending ? "Saving logo..." : "Save gym logo"}
      </button>
    </form>
  );
}
