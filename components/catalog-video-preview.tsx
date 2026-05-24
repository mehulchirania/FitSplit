"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Video, X } from "@/components/icons";

function getYouTubeEmbedUrl(videoUrl: string): string | null {
  if (!videoUrl) return null;
  try {
    const url = new URL(videoUrl);
    if (url.hostname.includes("youtube.com")) {
      const id = url.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`;
      const shortsId = url.pathname.match(/\/shorts\/([^/?]+)/)?.[1];
      if (shortsId) return `https://www.youtube.com/embed/${shortsId}?autoplay=1&rel=0`;
    }
    if (url.hostname === "youtu.be") {
      const id = url.pathname.slice(1).split("?")[0];
      if (id) return `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`;
    }
  } catch {
    // not a valid URL
  }
  return null;
}

function isPortraitVideo(videoUrl: string | null | undefined): boolean {
  if (!videoUrl) return false;
  try {
    return Boolean(new URL(videoUrl).pathname.match(/\/shorts\//));
  } catch {
    return false;
  }
}

type VideoType = "tutorial" | "demo";

export function CatalogVideoPreview({
  exerciseName,
  gymVideoUrl = "",
  muscleGroup,
  videoUrl = "",
}: {
  exerciseName: string;
  gymVideoUrl?: string;
  muscleGroup: string;
  videoUrl?: string;
}) {
  const [activeVideo, setActiveVideo] = useState<VideoType | null>(null);

  const activeRawUrl = activeVideo
    ? (activeVideo === "demo" ? gymVideoUrl : videoUrl)
    : null;
  const activeEmbedUrl = activeRawUrl ? getYouTubeEmbedUrl(activeRawUrl) : null;

  const hasTutorial = Boolean(videoUrl);
  const hasDemo = Boolean(gymVideoUrl);

  if (!hasTutorial && !hasDemo) return null;

  return (
    <>
      <div style={{ display: "inline-flex", gap: "6px", alignItems: "center" }}>
        {hasTutorial && (
          <button
            aria-label={`Preview ${exerciseName} DeltaBolic tutorial`}
            className="video-indicator video-indicator--tutorial"
            onClick={() => setActiveVideo("tutorial")}
            title="DeltaBolic tutorial"
            type="button"
          >
            <Video /><span className="video-indicator-label">DeltaBolic</span>
          </button>
        )}
        {hasDemo && (
          <button
            aria-label={`Preview ${exerciseName} gym demo`}
            className="video-indicator video-indicator--demo"
            onClick={() => setActiveVideo("demo")}
            title="Gym demo"
            type="button"
          >
            <Video /><span className="video-indicator-label">Gym video</span>
          </button>
        )}
      </div>

      {activeVideo && typeof document !== "undefined" && createPortal(
        <div
          className="video-modal-backdrop"
          onClick={() => setActiveVideo(null)}
          role="presentation"
        >
          <div
            className={`video-modal${isPortraitVideo(activeRawUrl) ? " video-modal--portrait" : ""}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="video-modal-header">
              <div>
                <p className="eyebrow">
                  {muscleGroup}
                  {" · "}
                  {activeVideo === "demo" ? "Gym Demo" : "DeltaBolic Tutorial"}
                </p>
                <h3 style={{ margin: 0, fontSize: "1rem" }}>{exerciseName}</h3>
              </div>
              <button
                aria-label="Close video"
                className="icon-button neutral-icon-button"
                onClick={() => setActiveVideo(null)}
                type="button"
              >
                <X />
              </button>
            </div>
            {activeEmbedUrl ? (
              <iframe
                allow="autoplay; encrypted-media"
                allowFullScreen
                className={`video-embed${isPortraitVideo(activeRawUrl) ? " video-embed--portrait" : ""}`}
                src={activeEmbedUrl}
                title={`${exerciseName} ${activeVideo === "demo" ? "gym demo" : "tutorial"}`}
              />
            ) : (
              <div style={{ padding: "32px", textAlign: "center", color: "var(--text-soft)" }}>
                <p>This video opens outside FitSplit.</p>
                <a
                  href={activeRawUrl ?? ""}
                  rel="noopener noreferrer"
                  style={{ color: "var(--brand)" }}
                  target="_blank"
                >
                  Open video
                </a>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
