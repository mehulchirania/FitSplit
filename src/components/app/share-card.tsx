"use client";

import { useState } from "react";
import { toast } from "sonner";

export type ShareCardData = {
  title: string;
  durationLabel: string;
  volumeLabel: string;
  prCount: number;
  /** Shown small under the title, e.g. "Sat, Nov 14". */
  dateLabel: string;
};

const W = 1080;
const H = 1350;

/** Colours come from the CSS tokens at draw time, so the palette stays in its one stylesheet. */
function readTokens() {
  const css = getComputedStyle(document.documentElement);
  const pick = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
  return {
    bg: pick("--bg", "#0A0A0A"),
    panel: pick("--bg-elevated", "#161616"),
    line: pick("--border-strong", "#555555"),
    text: pick("--text", "#F5F5F5"),
    soft: pick("--text-soft", "#A1A1A1"),
    accent: pick("--accent", "#C8F135")
  };
}

/** Draws the card to a canvas. Lime is only ever a fill, with the page background as its ink. */
function drawShareCard(canvas: HTMLCanvasElement, d: ShareCardData) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const t = readTokens();
  canvas.width = W;
  canvas.height = H;
  const font = getComputedStyle(document.body).fontFamily || "sans-serif";
  const pad = 88;

  ctx.fillStyle = t.bg;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = t.accent;
  ctx.fillRect(pad, pad, 72, 10);

  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = t.soft;
  ctx.font = `600 34px ${font}`;
  ctx.fillText("FITSPLIT", pad, pad + 70);
  ctx.textAlign = "right";
  ctx.fillText(d.dateLabel, W - pad, pad + 70);
  ctx.textAlign = "left";

  // Title, wrapped to two lines at most.
  ctx.fillStyle = t.text;
  ctx.font = `700 112px ${font}`;
  const lines = wrap(ctx, d.title || "Workout", W - pad * 2, 2);
  lines.forEach((line, i) => ctx.fillText(line, pad, 430 + i * 124));
  ctx.fillStyle = t.soft;
  ctx.font = `500 44px ${font}`;
  ctx.fillText("Workout complete", pad, 430 + lines.length * 124 + 20);

  // Stats
  const stats: [string, string][] = [
    ["TIME", d.durationLabel],
    ["VOLUME", d.volumeLabel]
  ];
  const top = 830;
  stats.forEach(([label, value], i) => {
    const y = top + i * 190;
    ctx.fillStyle = t.line;
    ctx.fillRect(pad, y - 40, W - pad * 2, 2);
    ctx.fillStyle = t.soft;
    ctx.font = `600 32px ${font}`;
    ctx.fillText(label, pad, y + 30);
    ctx.fillStyle = t.text;
    ctx.font = `700 84px ${font}`;
    ctx.textAlign = "right";
    ctx.fillText(value, W - pad, y + 100);
    ctx.textAlign = "left";
  });

  if (d.prCount > 0) {
    const text = d.prCount === 1 ? "1 personal best" : `${d.prCount} personal bests`;
    ctx.font = `700 38px ${font}`;
    const w = ctx.measureText(text).width + 72;
    ctx.fillStyle = t.accent;
    roundRect(ctx, pad, H - pad - 84, w, 84, 42);
    ctx.fill();
    ctx.fillStyle = t.bg;
    ctx.fillText(text, pad + 36, H - pad - 28);
  }
}

function wrap(ctx: CanvasRenderingContext2D, text: string, max: number, maxLines: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(next).width > max && cur) {
      lines.push(cur);
      cur = w;
    } else cur = next;
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = `${kept[maxLines - 1].replace(/\s+\S*$/, "")}…`;
    return kept;
  }
  return lines;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function toBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
}

/** Share the finished workout as an image: native share sheet when it can take files, PNG download otherwise. */
export function ShareCardButton({ data }: { data: ShareCardData }) {
  const [busy, setBusy] = useState(false);

  async function share() {
    setBusy(true);
    try {
      const canvas = document.createElement("canvas");
      drawShareCard(canvas, data);
      const blob = await toBlob(canvas);
      if (!blob) throw new Error("render failed");
      const file = new File([blob], "fitsplit-workout.png", { type: "image/png" });
      if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: data.title });
          return;
        } catch (err) {
          if (err instanceof DOMException && err.name === "AbortError") return; // user closed the sheet
          /* any other share failure: fall through to download */
        }
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "fitsplit-workout.png";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      toast.error("Could not create the image.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button type="button" className="fs-btn fs-btn--secondary fs-btn--lg" onClick={share} disabled={busy}>
      {busy ? "Preparing…" : "Share workout"}
    </button>
  );
}
