"use client";

import type { MouseEvent } from "react";
import { useEffect, useState } from "react";
import { Dumbbell, X } from "@/components/icons";

export function ExerciseThumbnailPreview({
  alt,
  className,
  thumbnailUrl
}: {
  alt: string;
  className: string;
  thumbnailUrl?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  const openPreview = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (thumbnailUrl) {
      setIsOpen(true);
    }
  };

  return (
    <>
      <button
        aria-label={thumbnailUrl ? `Enlarge ${alt} thumbnail` : `${alt} thumbnail unavailable`}
        className={`${className} thumbnail-preview-trigger`}
        disabled={!thumbnailUrl}
        onClick={openPreview}
        style={thumbnailUrl ? { backgroundImage: `url(${thumbnailUrl})` } : undefined}
        type="button"
      >
        {!thumbnailUrl ? <Dumbbell className="catalog-thumb-placeholder" /> : null}
      </button>

      {isOpen && thumbnailUrl ? (
        <div
          className="image-modal-backdrop"
          onClick={() => setIsOpen(false)}
          role="presentation"
        >
          <div
            aria-modal="true"
            className="image-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="image-modal-header">
              <div>
                <p className="eyebrow">Exercise thumbnail</p>
                <h3>{alt}</h3>
              </div>
              <button
                aria-label="Close image preview"
                className="icon-button neutral-icon-button"
                onClick={() => setIsOpen(false)}
                type="button"
              >
                <X />
              </button>
            </div>
            <img alt={alt} className="image-modal-media" src={thumbnailUrl} />
          </div>
        </div>
      ) : null}
    </>
  );
}
