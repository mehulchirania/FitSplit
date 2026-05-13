"use client";

import { useEffect, useState } from "react";

const slides = [
  {
    eyebrow: "Member workouts",
    title: "Daily training, already planned.",
    body: "Members open FitSplit and see the exact workout assigned by their coach, including weekly schedule context and exercise guidance.",
    image:
      "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1300&q=80"
  },
  {
    eyebrow: "Owner dashboard",
    title: "Know who needs attention.",
    body: "Owners can manage members, assign programs, and monitor training coverage without switching between scattered spreadsheets.",
    image:
      "https://images.unsplash.com/photo-1576678927484-cc907957088c?auto=format&fit=crop&w=1300&q=80"
  },
  {
    eyebrow: "Semi-personal trainer",
    title: "AI-assisted plan changes.",
    body: "Injury and limitation updates can guide safer swaps, helping owners deliver a semi-personal trainer experience at scale.",
    image:
      "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=1300&q=80"
  },
  {
    eyebrow: "Live capacity",
    title: "See the gym floor in motion.",
    body: "Start and end workout sessions show members how busy the gym is and help owners spot peak training times.",
    image:
      "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1300&q=80"
  },
  {
    eyebrow: "Progress tracking",
    title: "Progressive overload, not guesswork.",
    body: "Lift logs keep weight, sets, and reps close to the workout, so members can train with last week in view.",
    image:
      "https://images.unsplash.com/photo-1581009137042-c552e485697a?auto=format&fit=crop&w=1300&q=80"
  }
];

export function FeatureCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeSlide = slides[activeIndex];

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, 5200);

    return () => window.clearInterval(timer);
  }, []);

  function previousSlide() {
    setActiveIndex((current) => (current - 1 + slides.length) % slides.length);
  }

  function nextSlide() {
    setActiveIndex((current) => (current + 1) % slides.length);
  }

  return (
    <section className="intro-carousel" aria-label="FitSplit features">
      <div className="intro-carousel-image" style={{ backgroundImage: `url(${activeSlide.image})` }} />
      <div className="intro-carousel-copy">
        <p className="eyebrow">{activeSlide.eyebrow}</p>
        <h2>{activeSlide.title}</h2>
        <p>{activeSlide.body}</p>
      </div>

      <div className="intro-carousel-controls" aria-label="Carousel controls">
        <button aria-label="Previous feature" onClick={previousSlide} type="button">
          Prev
        </button>
        <div className="intro-carousel-dots">
          {slides.map((slide, index) => (
            <button
              aria-label={`Show ${slide.eyebrow}`}
              aria-current={index === activeIndex}
              className={index === activeIndex ? "is-active" : ""}
              key={slide.eyebrow}
              onClick={() => setActiveIndex(index)}
              type="button"
            />
          ))}
        </div>
        <button aria-label="Next feature" onClick={nextSlide} type="button">
          Next
        </button>
      </div>
    </section>
  );
}
