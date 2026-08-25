"use client";

import { useCallback, useRef, useState } from "react";
import { SLIDES } from "./onboarding-content";

export function OnboardingCarousel({ onFinish }: { onFinish: () => void }) {
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const total = SLIDES.length;
  const isLast = index === total - 1;

  const goTo = useCallback(
    (next: number) => {
      setIndex(Math.max(0, Math.min(total - 1, next)));
    },
    [total]
  );

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < 40) return;
    if (delta < 0) goTo(index + 1);
    else goTo(index - 1);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      goTo(index + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      goTo(index - 1);
    }
  }

  return (
    <div className="ob-screen">
      <div className="ob-topbar">
        <span className="ob-wordmark">FitSplit</span>
        <button type="button" className="ob-skip" onClick={onFinish}>
          Skip
        </button>
      </div>

      <div
        className="ob-carousel"
        role="region"
        aria-roledescription="carousel"
        aria-label="FitSplit feature preview"
        tabIndex={0}
        onKeyDown={onKeyDown}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div className="ob-track" style={{ transform: `translateX(-${index * 100}%)` }}>
          {SLIDES.map((slide, i) => {
            const Icon = slide.icon;
            return (
              <div
                key={slide.id}
                className="ob-slide"
                role="group"
                aria-roledescription="slide"
                aria-label={`Slide ${i + 1} of ${total}: ${slide.title}`}
                aria-hidden={i !== index}
                tabIndex={-1}
              >
                <div className="ob-slide-mark">
                  <Icon className="ob-slide-icon" />
                </div>
                <h2 className="ob-slide-title">{slide.title}</h2>
                <p className="ob-slide-body">{slide.body}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="ob-footer">
        <div className="ob-progress">
          <div className="ob-ticks" aria-hidden="true">
            {SLIDES.map((_, i) => (
              <span
                key={i}
                className={
                  "ob-tick" + (i === index ? " is-active" : i < index ? " is-done" : "")
                }
              />
            ))}
          </div>
          <span className="ob-count">
            Set {index + 1} of {total}
          </span>
        </div>

        <button
          type="button"
          className="button button-primary ob-next"
          onClick={() => (isLast ? onFinish() : goTo(index + 1))}
        >
          {isLast ? "Get started" : "Next"}
        </button>
      </div>
    </div>
  );
}
