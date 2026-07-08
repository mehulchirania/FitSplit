"use client";

import { useEffect, useRef } from "react";

type Particle = { x: number; y: number; r: number; vx: number; vy: number; base: number };

/** Cursor-reactive particle field — vanilla canvas, no WebGL dependency. */
function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let width = 0;
    let height = 0;
    const pointer = { x: -9999, y: -9999 };
    const particles: Particle[] = [];

    function resize() {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function seed() {
      particles.length = 0;
      const count = Math.floor((width * height) / 11000);
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          r: 1 + Math.random() * 1.6,
          vx: (Math.random() - 0.5) * 0.22,
          vy: (Math.random() - 0.5) * 0.22,
          base: 0.12 + Math.random() * 0.2
        });
      }
    }

    function draw() {
      ctx!.clearRect(0, 0, width, height);
      for (const p of particles) {
        if (!reduced) {
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < -4) p.x = width + 4;
          if (p.x > width + 4) p.x = -4;
          if (p.y < -4) p.y = height + 4;
          if (p.y > height + 4) p.y = -4;
        }
        const dx = p.x - pointer.x;
        const dy = p.y - pointer.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const glow = Math.max(0, 1 - dist / 190);
        const alpha = Math.min(0.85, p.base + glow * 0.7);
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.r + glow * 1.4, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(200, 241, 53, ${alpha})`;
        ctx!.fill();
      }
      if (!reduced) raf = requestAnimationFrame(draw);
    }

    function onPointerMove(e: PointerEvent) {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
      if (reduced) draw();
    }

    function onPointerLeave() {
      pointer.x = -9999;
      pointer.y = -9999;
      if (reduced) draw();
    }

    resize();
    seed();
    draw();

    const onResize = () => {
      resize();
      seed();
      if (reduced) draw();
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerleave", onPointerLeave);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerleave", onPointerLeave);
    };
  }, []);

  return <canvas ref={canvasRef} className="lp-hero__canvas" aria-hidden="true" />;
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

const SESSION_ROWS = [
  { name: "Barbell bench press", sets: "4 × 8 · 60 kg", done: true },
  { name: "Incline dumbbell press", sets: "3 × 10 · 22.5 kg", done: true },
  { name: "Cable fly", sets: "3 × 12 · 15 kg", done: false }
];

const CHART_BARS = [42, 58, 36, 72, 64, 88, 78];

/** Stylised product mockups with pointer-parallax tilt. */
export function HeroVisual() {
  const stackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stack = stackRef.current;
    if (!stack) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;

    let raf = 0;
    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };

    function onMove(e: PointerEvent) {
      const rect = stack!.getBoundingClientRect();
      target.x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      target.y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    }

    function onLeave() {
      target.x = 0;
      target.y = 0;
    }

    function tick() {
      current.x += (target.x - current.x) * 0.08;
      current.y += (target.y - current.y) * 0.08;
      const cards = stack!.querySelectorAll<HTMLElement>(".lp-mock");
      cards.forEach((card, i) => {
        const depth = 6 + i * 5;
        card.style.transform = `translate(${current.x * depth}px, ${current.y * depth}px) rotateX(${-current.y * 2.4}deg) rotateY(${current.x * 2.4}deg)`;
      });
      raf = requestAnimationFrame(tick);
    }

    stack.parentElement?.addEventListener("pointermove", onMove, { passive: true });
    stack.parentElement?.addEventListener("pointerleave", onLeave);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      stack.parentElement?.removeEventListener("pointermove", onMove);
      stack.parentElement?.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div className="lp-hero__visual" aria-hidden="true">
      <ParticleCanvas />
      <div ref={stackRef} className="lp-mock-stack" style={{ perspective: "1100px" }}>
        <div className="lp-mock lp-mock--toast">
          <span className="lp-mock__toast-icon">
            <CheckIcon />
          </span>
          <span>
            <span className="lp-mock__toast-title">Payment approved</span>
            <br />
            <span className="lp-mock__toast-sub">Quarterly plan · renewed today</span>
          </span>
        </div>

        <div className="lp-mock lp-mock--session">
          <div className="lp-mock__head">
            <span className="lp-mock__title">Today&apos;s session</span>
            <span className="lp-mock__pill">Push day</span>
          </div>
          {SESSION_ROWS.map((row) => (
            <div key={row.name} className="lp-mock__row">
              <span className={row.done ? "lp-mock__check" : "lp-mock__check lp-mock__check--off"}>
                <CheckIcon />
              </span>
              <span className="lp-mock__ex">
                <span className="lp-mock__ex-name">{row.name}</span>
                <br />
                <span className="lp-mock__ex-sets">{row.sets}</span>
              </span>
            </div>
          ))}
        </div>

        <div className="lp-mock lp-mock--chart">
          <div className="lp-mock__head">
            <span className="lp-mock__title">Bench press</span>
            <span className="lp-mock__meta">8-week trend</span>
          </div>
          <div className="lp-mock__bars">
            {CHART_BARS.map((h, i) => (
              <span key={i} className="lp-mock__bar" style={{ height: `${h}%`, animationDelay: `${i * 90}ms` }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
