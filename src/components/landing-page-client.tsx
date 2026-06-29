"use client";

import { FirebaseError } from "firebase/app";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import type { FormEvent } from "react";
import { loginWithCredentials, requestPasswordReset } from "@/lib/auth";

// ─── Auth helpers ─────────────────────────────────────────────────────────────

function authErrMsg(err: unknown) {
  if (err instanceof FirebaseError) {
    if (["auth/invalid-credential", "auth/user-not-found", "auth/wrong-password"].includes(err.code))
      return "Invalid login details.";
    if (err.code === "auth/too-many-requests") return "Too many attempts. Wait a minute and try again.";
  }
  return "Unable to sign in. Please try again.";
}

// ─── SVG icons ────────────────────────────────────────────────────────────────

function IconDumbbell() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6.5 6.5 17.5 17.5M21 21l-1-1M3 3l1 1M18 22l4-4M2 6l4-4M3 10l7-7M14 21l7-7" />
    </svg>
  );
}
function IconCalendar() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}
function IconChart() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18M18 17V9M13 17V5M8 17v-3" />
    </svg>
  );
}
function IconUsers() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function IconArrow() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function featIcon(icon: string) {
  if (icon === "dumbbell") return <IconDumbbell />;
  if (icon === "calendar") return <IconCalendar />;
  if (icon === "chart") return <IconChart />;
  return <IconUsers />;
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const NAV_LINKS = [
  { label: "Platform", href: "#platform" },
  { label: "Features", href: "#product" },
  { label: "How it works", href: "#how" },
  { label: "FAQ", href: "#faq" },
];

const FLOW = [
  { step: "01", kicker: "Buyer", title: "Gym owners", body: "Set up the gym, manage renewals and payments, and see the whole floor at a glance." },
  { step: "02", kicker: "Delivers", title: "Trainers", body: "Assign saved splits in seconds and coach members through every session." },
  { step: "03", kicker: "Trains", title: "Members", body: "Open the app to today's session, exercise targets, and check-offs on mobile." },
];

const FEATURES = [
  { icon: "dumbbell", tag: "Owners & trainers", title: "Assign workouts faster", body: "Pick a saved split, pick a member, done. Programs sync to the member app instantly." },
  { icon: "calendar", tag: "Members", title: "Keep training structured", body: "Members get a clear weekly plan and today's session — not scattered notes or chat messages." },
  { icon: "chart", tag: "Members & coaches", title: "Track every set", body: "Lift logs, progressive-overload hints, body metrics, and macros — all in one place." },
  { icon: "users", tag: "Owners", title: "Coordinate the floor", body: "Live floor view, in-gym roster, PT schedule, and renewals — the owner sees everything." },
];

const STEPS = [
  { n: "01", label: "Build your library", body: "Reusable workout splits, exercises, and program templates." },
  { n: "02", label: "Assign in seconds", body: "Pick a plan for a member; they get it instantly in the app." },
  { n: "03", label: "Members follow along", body: "Today's session, targets, and check-offs on mobile." },
  { n: "04", label: "Track the floor", body: "Renewals, attendance, and payments — at a glance." },
];

const FAQ_ITEMS = [
  { q: "How long does setup take?", a: "Most gyms are live in under a week. Import your member list, build your first program templates, and you're delivering structured workouts." },
  { q: "Do you support mobile apps?", a: "Yes — native-feel web apps for members and trainers. PWA install works on iOS and Android." },
  { q: "Can I migrate from spreadsheets or chat?", a: "We import members from CSV. Programs are quick to build once and reused forever." },
  { q: "Is there a free trial?", a: "Yes. Add as many members as you want during the trial, no card required." },
];

const FOOTER_COLS = [
  { h: "Product", items: [{ label: "Owner dashboard", href: null }, { label: "Trainer console", href: null }, { label: "Member app", href: null }] },
  { h: "Company", items: [{ label: "About", href: "/about" }, { label: "Privacy", href: "/privacy" }, { label: "Terms", href: "/terms" }] },
  { h: "Support", items: [{ label: "Help center", href: null }, { label: "Contact", href: null }, { label: "Status", href: null }] },
];

// ─── Login modal ──────────────────────────────────────────────────────────────

function LoginModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [mode, setMode] = useState<"member" | "staff">("member");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isPending, start] = useTransition();
  const isMember = mode === "member";

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  function switchMode(next: "member" | "staff") {
    setMode(next); setUsername(""); setPassword(""); setError("");
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const u = username.trim(), p = password.trim();
    if (!u) { setError(isMember ? "Enter your mobile number or username." : "Enter your username."); return; }
    if (isMember && !/^\d{4}$/.test(p)) { setError("PIN must be exactly 4 numeric digits."); return; }
    if (!isMember && !p) { setError("Enter your password."); return; }

    start(async () => {
      try {
        const fd = new FormData();
        fd.set("username", u); fd.set("password", p); fd.set("mode", mode);
        const session = await loginWithCredentials(fd);
        if (session.status !== "success") { setError(session.message); return; }
        window.scrollTo(0, 0);
        window.localStorage.setItem("fitsplit-session-start", String(Date.now()));
        window.location.replace(session.redirectUrl);
      } catch (err) {
        setError(authErrMsg(err));
      }
    });
  }

  function onForgot() {
    setError("");
    const u = username.trim();
    if (!u) { setError(isMember ? "Enter your mobile number or username first." : "Enter your username first."); return; }
    const msg = isMember
      ? "A reset request will be sent to the gym owner. Contact them for your new PIN."
      : "A reset request will be sent to the gym owner and admin.";
    if (!window.confirm(msg)) return;
    start(async () => {
      const fd = new FormData();
      fd.set("username", u); fd.set("mode", mode);
      const result = await requestPasswordReset(fd);
      if (result.status === "success") window.alert(result.message);
      else setError(result.message);
    });
  }

  if (!open) return null;

  const tabBase: React.CSSProperties = { flex: 1, border: "none", cursor: "pointer", fontFamily: "'Sora',sans-serif", fontSize: "13.5px", fontWeight: 600, padding: "9px", borderRadius: "9px", transition: "all 0.15s" };
  const tabOn: React.CSSProperties = { ...tabBase, background: "rgba(200,241,53,0.15)", color: "#C8F135" };
  const tabOff: React.CSSProperties = { ...tabBase, background: "transparent", color: "#8a8a8a" };

  return (
    <div
      className="fs-login-overlay"
      style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", background: "rgba(4,4,4,0.7)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <div
        className="fs-login-panel"
        style={{ position: "relative", width: "100%", maxWidth: "430px", background: "linear-gradient(180deg, rgba(26,26,26,0.96), rgba(14,14,14,0.96))", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "24px", padding: "32px", boxShadow: "0 40px 100px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.06)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ position: "absolute", top: "-1px", left: "32px", right: "32px", height: "1px", background: "linear-gradient(90deg, transparent, rgba(200,241,53,0.6), transparent)" }} />

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "22px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/new_logo.png" alt="FitSplit" style={{ height: "30px", width: "auto", display: "block" }} />
            <span style={{ fontFamily: "'Sora',sans-serif", fontSize: "16px", fontWeight: 700, letterSpacing: "-0.015em", color: "#F5F5F5" }}>FitSplit</span>
          </div>
          <button
            type="button" onClick={onClose} aria-label="Close"
            style={{ width: "34px", height: "34px", borderRadius: "999px", background: "rgba(255,255,255,0.06)", border: "none", color: "#9a9a9a", fontSize: "16px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          >✕</button>
        </div>

        <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: "24px", fontWeight: 700, letterSpacing: "-0.025em", margin: "0 0 6px", color: "#F5F5F5" }}>Access your workspace</h2>
        <p style={{ fontSize: "13.5px", color: "#9a9a9a", margin: "0 0 22px", lineHeight: 1.5 }}>
          Members use mobile / username + PIN. Staff use username + password.
        </p>

        {/* Tabs */}
        <div style={{ display: "flex", background: "rgba(255,255,255,0.05)", borderRadius: "12px", padding: "4px", marginBottom: "20px" }}>
          <button type="button" onClick={() => switchMode("member")} style={isMember ? tabOn : tabOff}>Member</button>
          <button type="button" onClick={() => switchMode("staff")} style={!isMember ? tabOn : tabOff}>Staff</button>
        </div>

        {/* Form */}
        <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
            <label style={{ fontSize: "12.5px", fontWeight: 600, color: "#cfcfcf" }}>{isMember ? "Mobile number or username" : "Username"}</label>
            <input
              type="text" autoComplete="username" value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "11px", padding: "13px 14px", fontSize: "14.5px", color: "#F5F5F5", outline: "none", fontFamily: "inherit" }}
              onFocus={(e) => { e.target.style.borderColor = "#C8F135"; e.target.style.background = "rgba(255,255,255,0.08)"; }}
              onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; e.target.style.background = "rgba(255,255,255,0.05)"; }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
            <label style={{ fontSize: "12.5px", fontWeight: 600, color: "#cfcfcf" }}>{isMember ? "4-digit PIN" : "Password"}</label>
            <input
              type="password" autoComplete={isMember ? "one-time-code" : "current-password"}
              inputMode={isMember ? "numeric" : undefined} maxLength={isMember ? 4 : undefined}
              value={password}
              onChange={(e) => setPassword(isMember ? e.target.value.replace(/\D/g, "").slice(0, 4) : e.target.value)}
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "11px", padding: "13px 14px", fontSize: "14.5px", color: "#F5F5F5", outline: "none", fontFamily: "inherit" }}
              onFocus={(e) => { e.target.style.borderColor = "#C8F135"; e.target.style.background = "rgba(255,255,255,0.08)"; }}
              onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; e.target.style.background = "rgba(255,255,255,0.05)"; }}
            />
          </div>
          {error && <p style={{ fontSize: "12.5px", color: "#ef4444", background: "rgba(239,68,68,0.12)", padding: "9px 13px", borderRadius: "9px", margin: 0 }}>{error}</p>}

          <button
            type="submit" disabled={isPending}
            style={{ marginTop: "4px", display: "flex", alignItems: "center", justifyContent: "center", background: "#C8F135", color: "#0A0A0A", border: "none", borderRadius: "12px", fontFamily: "'Sora',sans-serif", fontSize: "15px", fontWeight: 700, padding: "14px", cursor: isPending ? "not-allowed" : "pointer", opacity: isPending ? 0.7 : 1 }}
          >
            {isPending ? "Logging in…" : "Log in"}
          </button>
          <button
            type="button" onClick={onForgot} disabled={isPending}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: "12.5px", color: "#C8F135", fontWeight: 600, padding: "4px", marginTop: "2px" }}
          >
            Forgot password?
          </button>
        </form>

        <p style={{ fontSize: "12px", color: "#6a6a6a", textAlign: "center", margin: "18px 0 0" }}>
          Secure access for members, trainers &amp; gym owners.
        </p>
      </div>
    </div>
  );
}

// ─── Three.js canvas ──────────────────────────────────────────────────────────

function ThreeCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({ mx: 0, my: 0, scroll: 0, raf: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderCanvas = canvas;
    let destroyed = false;

    import("three").then((THREE) => {
      if (destroyed) return;
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 100);
      camera.position.set(0, 0, 10);

      const renderer = new THREE.WebGLRenderer({ canvas: renderCanvas, alpha: true, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(window.innerWidth, window.innerHeight);

      scene.add(new THREE.AmbientLight(0x404044, 1.1));
      const key = new THREE.DirectionalLight(0xffffff, 1.4);
      key.position.set(5, 6, 8); scene.add(key);
      const rim = new THREE.DirectionalLight(0xc8f135, 1.6);
      rim.position.set(-6, -2, 4); scene.add(rim);
      const lime = new THREE.PointLight(0xc8f135, 2.2, 30);
      lime.position.set(-3, 3, 5); scene.add(lime);

      const metal = new THREE.MeshStandardMaterial({ color: 0x171717, metalness: 0.95, roughness: 0.32 });
      const chrome = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 1.0, roughness: 0.22 });
      const limeMat = new THREE.MeshStandardMaterial({ color: 0xc8f135, metalness: 0.5, roughness: 0.28, emissive: new THREE.Color(0x4a5c10), emissiveIntensity: 0.6 });

      // Dumbbell
      const dumbbell = new THREE.Group();
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 3.0, 32), chrome);
      handle.rotation.z = Math.PI / 2; dumbbell.add(handle);
      ([-1, 1] as const).forEach((dir) => {
        const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.4, 28), chrome);
        collar.rotation.z = Math.PI / 2; collar.position.x = dir * 1.25; dumbbell.add(collar);
        const plateBig = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.34, 44), metal);
        plateBig.rotation.z = Math.PI / 2; plateBig.position.x = dir * 1.6; dumbbell.add(plateBig);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.05, 18, 50), limeMat);
        ring.rotation.y = Math.PI / 2; ring.position.x = dir * 1.77; dumbbell.add(ring);
        const plateMid = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.32, 40), metal);
        plateMid.rotation.z = Math.PI / 2; plateMid.position.x = dir * 1.95; dumbbell.add(plateMid);
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.28, 32), chrome);
        cap.rotation.z = Math.PI / 2; cap.position.x = dir * 2.2; dumbbell.add(cap);
      });
      scene.add(dumbbell);

      // Kettlebell
      const kettle = new THREE.Group();
      const bell = new THREE.Mesh(new THREE.SphereGeometry(0.7, 36, 28), metal);
      bell.scale.set(1, 0.92, 1); kettle.add(bell);
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.4, 0.32, 28), metal);
      neck.position.y = 0.62; kettle.add(neck);
      const handleK = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.085, 18, 40, Math.PI), limeMat);
      handleK.position.y = 0.86; handleK.rotation.z = Math.PI; kettle.add(handleK);
      const hl = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.5, 16), limeMat);
      hl.position.set(-0.4, 0.7, 0); kettle.add(hl);
      const hr = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.5, 16), limeMat);
      hr.position.set(0.4, 0.7, 0); kettle.add(hr);
      kettle.scale.set(0.9, 0.9, 0.9); scene.add(kettle);

      const s = stateRef.current;
      s.scroll = window.scrollY;

      const onMove = (e: MouseEvent) => { s.mx = e.clientX / window.innerWidth - 0.5; s.my = e.clientY / window.innerHeight - 0.5; };
      const onScroll = () => { s.scroll = window.scrollY; };
      const onResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      };
      window.addEventListener("mousemove", onMove, { passive: true });
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onResize);

      const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

      function animate() {
        s.raf = requestAnimationFrame(animate);
        const time = performance.now() * 0.001;
        const docH = Math.max(1, document.body.scrollHeight - window.innerHeight);
        const prog = Math.min(1, Math.max(0, s.scroll / docH));

        const fade = Math.max(0.14, 1 - prog / 0.16);
        renderCanvas.style.opacity = String(fade);

        dumbbell.rotation.y += 0.005;
        dumbbell.rotation.x = lerp(dumbbell.rotation.x, s.my * 0.4 - 0.12 + prog * 1.0, 0.05);
        dumbbell.rotation.z = lerp(dumbbell.rotation.z, s.mx * 0.22, 0.05);
        dumbbell.position.x = lerp(dumbbell.position.x, 3.5 + s.mx * 0.4 + prog * 1.0, 0.05);
        dumbbell.position.y = lerp(dumbbell.position.y, 0.7 + Math.sin(time * 0.9) * 0.14 - prog * 4, 0.05);
        dumbbell.position.z = lerp(dumbbell.position.z, -1.4 - prog * 2, 0.05);
        const ds = 0.6 - prog * 0.12;
        dumbbell.scale.set(ds, ds, ds);

        const kp = Math.min(1, Math.max(0, (prog - 0.16) / 0.5));
        kettle.rotation.y -= 0.006;
        kettle.rotation.x = lerp(kettle.rotation.x, s.my * 0.3 + 0.1, 0.05);
        kettle.position.x = lerp(kettle.position.x, 3.8 - s.mx * 0.4, 0.05);
        kettle.position.y = lerp(kettle.position.y, 4.5 - kp * 4.2 + Math.sin(time * 1.1) * 0.18, 0.05);
        const ks = 0.34 + kp * 0.26;
        kettle.scale.set(ks, ks, ks);
        kettle.visible = kp > 0.02;

        camera.position.x = lerp(camera.position.x, s.mx * 0.7, 0.04);
        camera.position.y = lerp(camera.position.y, -s.my * 0.5, 0.04);
        camera.lookAt(0, 0, 0);

        lime.position.x = Math.sin(time * 0.6) * 4;
        lime.position.y = Math.cos(time * 0.5) * 3;

        renderer.render(scene, camera);
      }
      animate();

      return () => {
        destroyed = true;
        cancelAnimationFrame(s.raf);
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", onResize);
        renderer.dispose();
      };
    });

    return () => { destroyed = true; };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "fixed", inset: 0, zIndex: 1, width: "100vw", height: "100vh", pointerEvents: "none" }}
    />
  );
}

// ─── Scroll reveal ────────────────────────────────────────────────────────────

function useScrollReveal() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    const line = document.querySelector<HTMLElement>("[data-flowline]");

    function showEl(el: HTMLElement, delay: number) {
      (el as HTMLElement & { _shown?: boolean; _done?: boolean })._shown = true;
      const startAt = performance.now() + delay;
      const dur = 700;
      const ease = (t: number) => 1 - Math.pow(1 - t, 3);
      let raf = 0;
      const step = (now: number) => {
        let t = (now - startAt) / dur;
        if (t < 0) { raf = requestAnimationFrame(step); return; }
        if (t > 1) t = 1;
        const e = ease(t);
        el.style.setProperty("opacity", String(e), "important");
        el.style.setProperty("transform", `translateY(${24 * (1 - e)}px)`, "important");
        if (t < 1) raf = requestAnimationFrame(step);
        else (el as HTMLElement & { _done?: boolean })._done = true;
      };
      raf = requestAnimationFrame(step);
      setTimeout(() => {
        const typed = el as HTMLElement & { _done?: boolean };
        if (!typed._done) { cancelAnimationFrame(raf); typed._done = true; el.style.setProperty("opacity", "1", "important"); el.style.setProperty("transform", "translateY(0)", "important"); }
      }, 380 + delay);
    }

    function showLine(el: HTMLElement) {
      (el as HTMLElement & { _shown?: boolean; _done?: boolean })._shown = true;
      const startAt = performance.now() + 150;
      const dur = 1000;
      const ease = (t: number) => 1 - Math.pow(1 - t, 3);
      let raf = 0;
      const step = (now: number) => {
        let t = (now - startAt) / dur;
        if (t < 0) { raf = requestAnimationFrame(step); return; }
        if (t > 1) t = 1;
        el.style.setProperty("transform", `scaleX(${ease(t)})`, "important");
        if (t < 1) raf = requestAnimationFrame(step);
        else (el as HTMLElement & { _done?: boolean })._done = true;
      };
      raf = requestAnimationFrame(step);
      setTimeout(() => {
        const typed = el as HTMLElement & { _done?: boolean };
        if (!typed._done) { cancelAnimationFrame(raf); typed._done = true; el.style.setProperty("transform", "scaleX(1)", "important"); }
      }, 700);
    }

    function check() {
      const h = window.innerHeight;
      els.forEach((el, i) => {
        const typed = el as HTMLElement & { _shown?: boolean };
        if (typed._shown) return;
        const r = el.getBoundingClientRect();
        if (r.top < h * 0.92 && r.bottom > -40) showEl(el, Math.min(i % 4, 3) * 70);
      });
      if (line) {
        const typed = line as HTMLElement & { _shown?: boolean };
        if (!typed._shown) {
          const r = line.getBoundingClientRect();
          if (r.top < h * 0.82 && r.bottom > -40) showLine(line);
        }
      }
    }

    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    requestAnimationFrame(check);
    setTimeout(check, 100);
    setTimeout(check, 500);

    return () => {
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, []);
}

// ─── Nav ──────────────────────────────────────────────────────────────────────

function Nav({ onLogin }: { onLogin: () => void }) {
  return (
    <header style={{ position: "sticky", top: 0, zIndex: 40, backdropFilter: "blur(18px) saturate(150%)", WebkitBackdropFilter: "blur(18px) saturate(150%)", background: "rgba(6,6,6,0.55)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "14px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "24px" }}>
        <a href="#top" style={{ display: "inline-flex", alignItems: "center", gap: "11px", textDecoration: "none" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/new_logo.png" alt="FitSplit" style={{ height: "34px", width: "auto", display: "block" }} />
          <span style={{ fontFamily: "'Sora',sans-serif", fontSize: "20px", fontWeight: 700, letterSpacing: "-0.02em", color: "#F5F5F5" }}>FitSplit</span>
        </a>
        <nav style={{ display: "flex", gap: "6px" }}>
          {NAV_LINKS.map((link) => (
            <a
              key={link.label} href={link.href}
              style={{ fontSize: "14px", fontWeight: 500, color: "#9a9a9a", textDecoration: "none", padding: "8px 14px", borderRadius: "9px" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "#F5F5F5"; (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.05)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "#9a9a9a"; (e.currentTarget as HTMLAnchorElement).style.background = "transparent"; }}
            >
              {link.label}
            </a>
          ))}
        </nav>
        <button
          onClick={onLogin} type="button"
          style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "#C8F135", color: "#0A0A0A", border: "none", borderRadius: "999px", fontFamily: "'Sora',sans-serif", fontSize: "14px", fontWeight: 700, padding: "10px 22px", cursor: "pointer", boxShadow: "0 6px 24px rgba(200,241,53,0.25)" }}
          onMouseEnter={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.background = "#d4f95a"; b.style.boxShadow = "0 8px 30px rgba(200,241,53,0.4)"; }}
          onMouseLeave={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.background = "#C8F135"; b.style.boxShadow = "0 6px 24px rgba(200,241,53,0.25)"; }}
        >
          Log in
        </button>
      </div>
    </header>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero({ onLogin }: { onLogin: () => void }) {
  return (
    <section id="top" style={{ maxWidth: "1200px", margin: "0 auto", padding: "120px 32px 140px", minHeight: "88vh", display: "flex", flexDirection: "column", justifyContent: "center" }}>
      <div data-reveal style={{ display: "inline-flex", alignItems: "center", gap: "9px", alignSelf: "flex-start", background: "rgba(22,22,22,0.6)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "999px", padding: "7px 16px", fontSize: "12.5px", fontWeight: 600, color: "#bdbdbd", marginBottom: "30px" }}>
        <span style={{ position: "relative", width: "7px", height: "7px", borderRadius: "50%", background: "#C8F135", display: "inline-block" }}>
          <span style={{ position: "absolute", inset: "-3px", borderRadius: "50%", background: "#C8F135", opacity: 0.4, animation: "fs-pulse 1.8s infinite" }} />
        </span>
        Workout delivery for modern gyms
      </div>

      <h1 data-reveal style={{ fontFamily: "'Sora',sans-serif", fontSize: "clamp(44px,7vw,84px)", fontWeight: 700, letterSpacing: "-0.045em", lineHeight: 0.98, margin: "0 0 26px", maxWidth: "14ch", textShadow: "0 2px 40px rgba(0,0,0,0.5)", color: "#F5F5F5" }}>
        Structured workouts, delivered to{" "}
        <span style={{ background: "linear-gradient(120deg,#C8F135,#88b800)", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          every member.
        </span>
      </h1>

      <p data-reveal style={{ fontSize: "clamp(16px,1.6vw,19px)", color: "#b4b4b4", maxWidth: "560px", lineHeight: 1.6, margin: "0 0 38px" }}>
        One focused workspace where gym owners assign plans, trainers guide sessions, and members train with structure — not scattered notes and chat threads.
      </p>

      <div data-reveal style={{ display: "flex", alignItems: "center", gap: "20px", flexWrap: "wrap" }}>
        <button
          onClick={onLogin} type="button"
          style={{ display: "inline-flex", alignItems: "center", gap: "10px", background: "#C8F135", color: "#0A0A0A", border: "none", borderRadius: "999px", fontFamily: "'Sora',sans-serif", fontSize: "16px", fontWeight: 700, padding: "16px 34px", cursor: "pointer", boxShadow: "0 10px 40px rgba(200,241,53,0.3)", transition: "all 0.2s" }}
          onMouseEnter={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.background = "#d4f95a"; b.style.transform = "translateY(-2px)"; b.style.boxShadow = "0 14px 50px rgba(200,241,53,0.45)"; }}
          onMouseLeave={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.background = "#C8F135"; b.style.transform = ""; b.style.boxShadow = "0 10px 40px rgba(200,241,53,0.3)"; }}
        >
          Log in <IconArrow />
        </button>
        <span style={{ fontSize: "13.5px", color: "#7a7a7a" }}>Secure access for owners, trainers &amp; members</span>
      </div>
    </section>
  );
}

// ─── B2B2C Flow ───────────────────────────────────────────────────────────────

function Flow() {
  return (
    <section id="platform" style={{ maxWidth: "1200px", margin: "0 auto", padding: "40px 32px 120px" }}>
      <div data-reveal style={{ textAlign: "center", maxWidth: "660px", margin: "0 auto 70px" }}>
        <span style={{ fontSize: "11.5px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#C8F135", display: "inline-block", marginBottom: "14px" }}>One platform · three roles</span>
        <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: "clamp(30px,4vw,46px)", fontWeight: 700, letterSpacing: "-0.035em", lineHeight: 1.05, margin: "0 0 16px", color: "#F5F5F5" }}>The whole gym, on one thread.</h2>
        <p style={{ fontSize: "16px", color: "#a8a8a8", lineHeight: 1.6, margin: 0 }}>FitSplit connects the people who run the gym to the people who train in it — a single flow from purchase to progress.</p>
      </div>

      <div style={{ position: "relative" }}>
        <div data-flowline style={{ position: "absolute", top: "54px", left: "8%", right: "8%", height: "2px", background: "linear-gradient(90deg, transparent, rgba(200,241,53,0.5) 15%, rgba(200,241,53,0.5) 85%, transparent)", zIndex: 0, transformOrigin: "left center" }} />
        <div style={{ position: "relative", zIndex: 1, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "28px" }}>
          {FLOW.map((node) => (
            <div key={node.step} data-reveal style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ width: "108px", height: "108px", borderRadius: "26px", background: "rgba(17,17,17,0.9)", backdropFilter: "blur(12px)", border: "1px solid rgba(200,241,53,0.25)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "24px", boxShadow: "0 0 0 6px rgba(6,6,6,0.6), 0 14px 40px rgba(0,0,0,0.5)" }}>
                <span style={{ fontFamily: "'Sora',sans-serif", fontSize: "28px", fontWeight: 700, color: "#C8F135" }}>{node.step}</span>
              </div>
              <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#7a7a7a", marginBottom: "8px" }}>{node.kicker}</span>
              <h3 style={{ fontFamily: "'Sora',sans-serif", fontSize: "22px", fontWeight: 600, letterSpacing: "-0.02em", margin: "0 0 10px", color: "#F5F5F5" }}>{node.title}</h3>
              <p style={{ fontSize: "14.5px", color: "#a0a0a0", lineHeight: 1.6, margin: 0, maxWidth: "30ch" }}>{node.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Features ─────────────────────────────────────────────────────────────────

function Features() {
  return (
    <section id="product" style={{ maxWidth: "1200px", margin: "0 auto", padding: "40px 32px 120px" }}>
      <div data-reveal style={{ textAlign: "center", maxWidth: "640px", margin: "0 auto 56px" }}>
        <span style={{ fontSize: "11.5px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#C8F135", display: "inline-block", marginBottom: "14px" }}>Features</span>
        <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: "clamp(30px,4vw,46px)", fontWeight: 700, letterSpacing: "-0.035em", lineHeight: 1.05, margin: 0, color: "#F5F5F5" }}>Everything a coaching gym needs.</h2>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "18px" }}>
        {FEATURES.map((f) => (
          <div
            key={f.title} data-reveal
            style={{ position: "relative", background: "rgba(15,15,15,0.9)", backdropFilter: "blur(14px)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "20px", padding: "30px", transition: "border-color 0.2s" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(200,241,53,0.3)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.08)"; }}
          >
            <div style={{ width: "46px", height: "46px", borderRadius: "13px", background: "rgba(200,241,53,0.12)", color: "#C8F135", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "18px" }}>
              {featIcon(f.icon)}
            </div>
            <span style={{ position: "absolute", top: "28px", right: "28px", fontSize: "10.5px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#777", background: "rgba(255,255,255,0.05)", padding: "4px 10px", borderRadius: "999px" }}>{f.tag}</span>
            <h3 style={{ fontFamily: "'Sora',sans-serif", fontSize: "20px", fontWeight: 600, letterSpacing: "-0.02em", margin: "0 0 9px", color: "#F5F5F5" }}>{f.title}</h3>
            <p style={{ fontSize: "14.5px", color: "#a0a0a0", lineHeight: 1.6, margin: 0 }}>{f.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── How it works ─────────────────────────────────────────────────────────────

function HowItWorks() {
  return (
    <section id="how" style={{ maxWidth: "1200px", margin: "0 auto", padding: "40px 32px 120px" }}>
      <div data-reveal style={{ textAlign: "center", maxWidth: "640px", margin: "0 auto 56px" }}>
        <span style={{ fontSize: "11.5px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#C8F135", display: "inline-block", marginBottom: "14px" }}>How it works</span>
        <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: "clamp(30px,4vw,46px)", fontWeight: 700, letterSpacing: "-0.035em", lineHeight: 1.05, margin: "0 0 16px", color: "#F5F5F5" }}>Live in under a week.</h2>
        <p style={{ fontSize: "16px", color: "#a8a8a8", lineHeight: 1.6, margin: 0 }}>Import your members, build your first templates, and start delivering structured workouts.</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "18px" }}>
        {STEPS.map((s) => (
          <div key={s.n} data-reveal style={{ background: "rgba(15,15,15,0.9)", backdropFilter: "blur(14px)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "18px", padding: "26px" }}>
            <div style={{ display: "inline-block", fontFamily: "'Sora',sans-serif", fontSize: "13px", fontWeight: 700, color: "#C8F135", background: "rgba(200,241,53,0.12)", padding: "4px 12px", borderRadius: "999px", marginBottom: "18px" }}>{s.n}</div>
            <h3 style={{ fontFamily: "'Sora',sans-serif", fontSize: "17px", fontWeight: 600, letterSpacing: "-0.02em", margin: "0 0 8px", color: "#F5F5F5" }}>{s.label}</h3>
            <p style={{ fontSize: "13.5px", color: "#9c9c9c", lineHeight: 1.55, margin: 0 }}>{s.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── FAQ ──────────────────────────────────────────────────────────────────────

function FAQ() {
  const [openIdx, setOpenIdx] = useState(0);
  return (
    <section id="faq" style={{ maxWidth: "840px", margin: "0 auto", padding: "40px 32px 120px" }}>
      <div data-reveal style={{ marginBottom: "48px" }}>
        <span style={{ fontSize: "11.5px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#C8F135", display: "inline-block", marginBottom: "14px" }}>FAQ</span>
        <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: "clamp(30px,4vw,46px)", fontWeight: 700, letterSpacing: "-0.035em", lineHeight: 1.05, margin: 0, color: "#F5F5F5" }}>Common questions.</h2>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {FAQ_ITEMS.map((item, i) => (
          <div key={item.q} data-reveal style={{ background: "rgba(15,15,15,0.9)", backdropFilter: "blur(14px)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", overflow: "hidden" }}>
            <button
              type="button" onClick={() => setOpenIdx(openIdx === i ? -1 : i)}
              style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", background: "none", border: "none", cursor: "pointer", padding: "20px 24px", textAlign: "left", color: "#F5F5F5", fontFamily: "'Sora',sans-serif", fontSize: "16px", fontWeight: 600 }}
            >
              {item.q}
              <span style={{ flexShrink: 0, color: "#C8F135", fontSize: "22px", lineHeight: 1, transition: "transform 0.25s", transform: openIdx === i ? "rotate(45deg)" : "rotate(0deg)" }}>+</span>
            </button>
            <div style={{ maxHeight: openIdx === i ? "240px" : "0px", overflow: "hidden", transition: "max-height 0.3s ease" }}>
              <p style={{ margin: 0, padding: "0 24px 22px", fontSize: "14.5px", color: "#a0a0a0", lineHeight: 1.65 }}>{item.a}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── CTA ──────────────────────────────────────────────────────────────────────

function CTA({ onLogin }: { onLogin: () => void }) {
  return (
    <section style={{ maxWidth: "1200px", margin: "0 auto", padding: "20px 32px 130px" }}>
      <div data-reveal style={{ position: "relative", overflow: "hidden", borderRadius: "28px", border: "1px solid rgba(200,241,53,0.25)", background: "linear-gradient(135deg, rgba(200,241,53,0.12), rgba(16,16,16,0.7))", backdropFilter: "blur(16px)", padding: "64px 56px", textAlign: "center" }}>
        <div style={{ position: "absolute", top: "-120px", left: "50%", transform: "translateX(-50%)", width: "600px", height: "300px", background: "radial-gradient(closest-side, rgba(200,241,53,0.22), transparent 70%)", pointerEvents: "none" }} />
        <h2 style={{ position: "relative", fontFamily: "'Sora',sans-serif", fontSize: "clamp(28px,3.6vw,42px)", fontWeight: 700, letterSpacing: "-0.035em", lineHeight: 1.1, margin: "0 0 14px", color: "#F5F5F5" }}>
          Built for gyms that deliver coaching, <br />not just access.
        </h2>
        <p style={{ position: "relative", fontSize: "16px", color: "#b4b4b4", margin: "0 0 32px" }}>
          Sign in to your workspace and pick up where your members left off.
        </p>
        <button
          onClick={onLogin} type="button"
          style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: "10px", background: "#C8F135", color: "#0A0A0A", border: "none", borderRadius: "999px", fontFamily: "'Sora',sans-serif", fontSize: "16px", fontWeight: 700, padding: "16px 36px", cursor: "pointer", boxShadow: "0 10px 40px rgba(200,241,53,0.3)", transition: "all 0.2s" }}
          onMouseEnter={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.background = "#d4f95a"; b.style.transform = "translateY(-2px)"; }}
          onMouseLeave={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.background = "#C8F135"; b.style.transform = ""; }}
        >
          Log in <IconArrow />
        </button>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer style={{ borderTop: "1px solid rgba(255,255,255,0.08)", background: "rgba(6,6,6,0.7)", backdropFilter: "blur(12px)" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "54px 32px 28px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr 1fr", gap: "40px", paddingBottom: "32px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div>
            <a href="#top" style={{ display: "inline-flex", alignItems: "center", gap: "11px", textDecoration: "none" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/new_logo.png" alt="FitSplit" style={{ height: "32px", width: "auto", display: "block" }} />
              <span style={{ fontFamily: "'Sora',sans-serif", fontSize: "19px", fontWeight: 700, letterSpacing: "-0.02em", color: "#F5F5F5" }}>FitSplit</span>
            </a>
            <p style={{ fontSize: "14px", color: "#8a8a8a", margin: "16px 0 0", maxWidth: "280px", lineHeight: 1.6 }}>
              Workout delivery, trainer coordination, and member progress — one workspace.
            </p>
          </div>
          {FOOTER_COLS.map((col) => (
            <div key={col.h}>
              <h4 style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#6a6a6a", margin: "0 0 14px" }}>{col.h}</h4>
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "9px" }}>
                {col.items.map((it) => (
                  <li key={it.label}>
                    {it.href ? (
                      <Link href={it.href} style={{ color: "#9a9a9a", textDecoration: "none", fontSize: "14px" }}>{it.label}</Link>
                    ) : (
                      <span style={{ color: "#9a9a9a", fontSize: "14px" }}>{it.label}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div style={{ paddingTop: "22px", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "10px", fontSize: "12.5px", color: "#6a6a6a" }}>
          <span>© 2026 FitSplit · fitsplit.in</span>
          <span>Built in India</span>
        </div>
      </div>
    </footer>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function LandingPageClient() {
  const [loginOpen, setLoginOpen] = useState(false);
  useScrollReveal();

  useEffect(() => {
    // Force dark theme and load Sora font
    document.documentElement.setAttribute("data-theme", "dark");
    if (!document.getElementById("fs-sora-font")) {
      const link = document.createElement("link");
      link.id = "fs-sora-font";
      link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&display=swap";
      document.head.appendChild(link);
    }
  }, []);

  return (
    <>
      <style>{`
        @keyframes fs-pulse { 0% { transform: scale(0.6); opacity: 0.5; } 100% { transform: scale(2.4); opacity: 0; } }
        [data-reveal] { opacity: 0; transform: translateY(28px); }
        [data-flowline] { transform: scaleX(0); transform-origin: left center; }
        html { scroll-behavior: smooth; }
        ::selection { background: #C8F135; color: #0A0A0A; }

        @media (max-width: 900px) {
          .fs-landing-root {
            overflow-x: hidden;
          }

          .fs-landing-root header > div {
            padding: 12px 20px !important;
            gap: 14px !important;
          }

          .fs-landing-root header nav {
            display: none !important;
          }

          .fs-landing-root header img {
            height: 30px !important;
          }

          .fs-landing-root header a span {
            font-size: 18px !important;
            letter-spacing: 0 !important;
          }

          .fs-landing-root header button {
            min-height: 40px !important;
            padding: 9px 16px !important;
            font-size: 13px !important;
            box-shadow: 0 4px 18px rgba(200,241,53,0.2) !important;
          }

          .fs-landing-root canvas {
            opacity: 0.38 !important;
          }

          .fs-landing-root #top {
            min-height: auto !important;
            padding: 86px 20px 74px !important;
          }

          .fs-landing-root #top h1 {
            max-width: 12ch !important;
            font-size: 48px !important;
            line-height: 1.04 !important;
            letter-spacing: 0 !important;
            margin-bottom: 22px !important;
          }

          .fs-landing-root #top p {
            max-width: 34rem !important;
            font-size: 16px !important;
            line-height: 1.65 !important;
            margin-bottom: 30px !important;
          }

          .fs-landing-root #top > div[data-reveal]:last-child {
            align-items: flex-start !important;
            gap: 12px !important;
          }

          .fs-landing-root #platform,
          .fs-landing-root #product,
          .fs-landing-root #how,
          .fs-landing-root #faq {
            max-width: 100% !important;
            padding: 34px 20px 76px !important;
          }

          .fs-landing-root #platform > div:first-child,
          .fs-landing-root #product > div:first-child,
          .fs-landing-root #how > div:first-child,
          .fs-landing-root #faq > div:first-child {
            max-width: 36rem !important;
            margin-bottom: 34px !important;
            text-align: left !important;
          }

          .fs-landing-root #platform h2,
          .fs-landing-root #product h2,
          .fs-landing-root #how h2,
          .fs-landing-root #faq h2,
          .fs-landing-root #faq + section h2 {
            font-size: 32px !important;
            line-height: 1.12 !important;
            letter-spacing: 0 !important;
          }

          .fs-landing-root #platform > div:first-child p,
          .fs-landing-root #how > div:first-child p {
            font-size: 15px !important;
            line-height: 1.62 !important;
          }

          .fs-landing-root #platform [data-flowline] {
            display: none !important;
          }

          .fs-landing-root #platform > div:last-child > div:last-child {
            grid-template-columns: 1fr !important;
            gap: 16px !important;
          }

          .fs-landing-root #platform > div:last-child > div:last-child > div {
            display: grid !important;
            grid-template-columns: 64px minmax(0, 1fr) !important;
            column-gap: 16px !important;
            row-gap: 4px !important;
            align-items: start !important;
            text-align: left !important;
            background: rgba(15,15,15,0.84) !important;
            border: 1px solid rgba(255,255,255,0.08) !important;
            border-radius: 18px !important;
            padding: 18px !important;
          }

          .fs-landing-root #platform > div:last-child > div:last-child > div > div:first-child {
            grid-row: 1 / span 3 !important;
            width: 58px !important;
            height: 58px !important;
            border-radius: 16px !important;
            margin: 0 !important;
            box-shadow: 0 10px 30px rgba(0,0,0,0.35) !important;
          }

          .fs-landing-root #platform > div:last-child > div:last-child > div > div:first-child span {
            font-size: 20px !important;
          }

          .fs-landing-root #platform h3 {
            font-size: 19px !important;
            letter-spacing: 0 !important;
            margin-bottom: 6px !important;
          }

          .fs-landing-root #platform > div:last-child p {
            max-width: none !important;
          }

          .fs-landing-root #product > div:last-child,
          .fs-landing-root #how > div:last-child {
            grid-template-columns: 1fr !important;
            gap: 14px !important;
          }

          .fs-landing-root #product > div:last-child > div,
          .fs-landing-root #how > div:last-child > div {
            padding: 22px !important;
            border-radius: 16px !important;
          }

          .fs-landing-root #product > div:last-child > div > span {
            position: static !important;
            display: inline-flex !important;
            max-width: 100% !important;
            margin: 0 0 14px !important;
            white-space: normal !important;
          }

          .fs-landing-root #product h3,
          .fs-landing-root #how h3 {
            letter-spacing: 0 !important;
          }

          .fs-landing-root #faq button {
            padding: 17px 18px !important;
            align-items: flex-start !important;
            font-size: 15px !important;
            line-height: 1.35 !important;
          }

          .fs-landing-root #faq p {
            padding: 0 18px 18px !important;
          }

          .fs-landing-root #faq + section {
            max-width: 100% !important;
            padding: 8px 20px 78px !important;
          }

          .fs-landing-root #faq + section > div {
            padding: 38px 24px !important;
            border-radius: 22px !important;
          }

          .fs-landing-root #faq + section h2 br {
            display: none !important;
          }

          .fs-landing-root #faq + section p {
            line-height: 1.55 !important;
          }

          .fs-landing-root footer > div {
            padding: 42px 20px 28px !important;
          }

          .fs-landing-root footer > div > div:first-child {
            grid-template-columns: 1.2fr 1fr !important;
            gap: 30px 22px !important;
          }

          .fs-login-overlay {
            align-items: flex-end !important;
            padding: 14px !important;
          }

          .fs-login-panel {
            max-height: calc(100dvh - 28px) !important;
            overflow-y: auto !important;
            border-radius: 22px !important;
            padding: 26px !important;
          }
        }

        @media (max-width: 640px) {
          .fs-landing-root #top {
            padding: 64px 18px 58px !important;
          }

          .fs-landing-root #top > div[data-reveal]:first-child {
            max-width: 100% !important;
            white-space: normal !important;
            line-height: 1.35 !important;
            margin-bottom: 22px !important;
          }

          .fs-landing-root #top h1 {
            max-width: 100% !important;
            font-size: 38px !important;
          }

          .fs-landing-root #top > div[data-reveal]:last-child {
            width: 100% !important;
            flex-direction: column !important;
          }

          .fs-landing-root #top > div[data-reveal]:last-child button,
          .fs-landing-root #faq + section button {
            width: 100% !important;
            min-height: 52px !important;
            justify-content: center !important;
          }

          .fs-landing-root #top > div[data-reveal]:last-child span {
            max-width: 24rem !important;
            line-height: 1.45 !important;
          }

          .fs-landing-root #platform,
          .fs-landing-root #product,
          .fs-landing-root #how,
          .fs-landing-root #faq {
            padding: 30px 18px 62px !important;
          }

          .fs-landing-root #platform h2,
          .fs-landing-root #product h2,
          .fs-landing-root #how h2,
          .fs-landing-root #faq h2,
          .fs-landing-root #faq + section h2 {
            font-size: 29px !important;
          }

          .fs-landing-root #platform > div:last-child > div:last-child > div {
            grid-template-columns: 54px minmax(0, 1fr) !important;
            column-gap: 14px !important;
            padding: 16px !important;
          }

          .fs-landing-root #platform > div:last-child > div:last-child > div > div:first-child {
            width: 50px !important;
            height: 50px !important;
            border-radius: 14px !important;
          }

          .fs-landing-root #product > div:last-child > div,
          .fs-landing-root #how > div:last-child > div {
            padding: 20px !important;
          }

          .fs-landing-root #faq + section {
            padding: 4px 18px 64px !important;
          }

          .fs-landing-root #faq + section > div {
            padding: 32px 20px !important;
          }

          .fs-landing-root footer > div > div:first-child {
            grid-template-columns: 1fr !important;
            gap: 26px !important;
          }

          .fs-landing-root footer > div > div:last-child {
            flex-direction: column !important;
          }

          .fs-login-panel {
            padding: 22px !important;
          }
        }
      `}</style>

      <div className="fs-landing-root" style={{ position: "relative", width: "100%", minHeight: "100vh", background: "#060606", color: "#F5F5F5", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif", WebkitFontSmoothing: "antialiased" }}>

        {/* Fixed atmospheric backdrop */}
        <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}>
          <div style={{ position: "absolute", inset: 0, backgroundImage: "url('https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=2000&q=80')", backgroundSize: "cover", backgroundPosition: "center", filter: "grayscale(0.3) contrast(1.05) brightness(0.42)" }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(6,6,6,0.72) 0%, rgba(6,6,6,0.55) 35%, rgba(6,6,6,0.82) 70%, #060606 100%)" }} />
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 60% 50% at 75% 30%, rgba(200,241,53,0.10), transparent 70%)" }} />
        </div>

        {/* Three.js canvas */}
        <ThreeCanvas />

        {/* Content */}
        <div style={{ position: "relative", zIndex: 2 }}>
          <Nav onLogin={() => setLoginOpen(true)} />
          <Hero onLogin={() => setLoginOpen(true)} />
          <Flow />
          <Features />
          <HowItWorks />
          <FAQ />
          <CTA onLogin={() => setLoginOpen(true)} />
          <Footer />
        </div>
      </div>

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </>
  );
}
