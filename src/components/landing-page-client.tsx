"use client";

import { FirebaseError } from "firebase/app";
import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import type { FormEvent } from "react";
import {
  AnimatePresence,
  LazyMotion,
  domAnimation,
  m,
} from "framer-motion";
import {
  ArrowRightIcon,
  BarChart3Icon,
  CalendarIcon,
  DumbbellIcon,
  UsersIcon,
} from "lucide-react";
import { loginWithCredentials, requestPasswordReset } from "@/lib/auth";
import { LANDING_MOCK } from "@/lib/landing-mock";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ─── Auth helpers ─────────────────────────────────────────────────────────────

function authErrMsg(err: unknown) {
  if (err instanceof FirebaseError) {
    if (["auth/invalid-credential", "auth/user-not-found", "auth/wrong-password"].includes(err.code)) {
      return "Invalid login details.";
    }
    if (err.code === "auth/too-many-requests") return "Too many attempts. Wait a minute and try again.";
  }
  return "Unable to sign in. Please try again.";
}

// ─── Brand mark ───────────────────────────────────────────────────────────────

function BrandMark({ size = 28 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/new_logo.png"
      alt=""
      width={size}
      height={size}
      style={{ borderRadius: 8, display: "block", objectFit: "contain" }}
    />
  );
}

// ─── Login modal ──────────────────────────────────────────────────────────────

function LoginModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [mode, setMode] = useState<"member" | "staff">("member");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, start] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const isMember = mode === "member";

  function switchMode(next: "member" | "staff") {
    setMode(next); setUsername(""); setPassword(""); setError(""); setMessage("");
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(""); setMessage("");
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
    setError(""); setMessage("");
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
      if (result.status === "success") { setMessage(result.message); window.alert(result.message); }
      else setError(result.message);
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="lp-modal max-w-[420px] gap-0 p-7" showCloseButton={false}>
        {/* Header */}
        <div className="lp-modal-hdr">
          <div className="lp-modal-brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/new_logo.png" alt="FitSplit" width="52" height="22" />
            <span>FitSplit</span>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            className="rounded-full text-muted-foreground"
            onClick={onClose}
            aria-label="Close login"
            type="button"
          >
            ✕
          </Button>
        </div>

        <DialogHeader className="mt-2 mb-4 text-left gap-1">
          <DialogTitle className="lp-modal-title">Access your workspace</DialogTitle>
          <DialogDescription className="lp-modal-sub">
            Members use mobile number/username + PIN. Staff use username + password.
          </DialogDescription>
        </DialogHeader>

        {/* Mode tabs */}
        <Tabs value={mode} onValueChange={(v) => switchMode(v as "member" | "staff")} className="mb-4">
          <TabsList className="w-full">
            <TabsTrigger value="member" className="flex-1">Member</TabsTrigger>
            <TabsTrigger value="staff" className="flex-1">Staff</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Form */}
        <form
          ref={formRef}
          className="lp-modal-form"
          onSubmit={onSubmit}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); formRef.current?.requestSubmit(); } }}
        >
          <div className="lp-field">
            <Label htmlFor="lp-username">{isMember ? "Mobile number or username" : "Username"}</Label>
            <Input
              id="lp-username"
              type="text"
              autoComplete="username"
              inputMode={isMember ? "email" : undefined}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="lp-input"
            />
          </div>
          <div className="lp-field">
            <Label htmlFor="lp-password">{isMember ? "4-digit PIN" : "Password"}</Label>
            <Input
              id="lp-password"
              type="password"
              autoComplete={isMember ? "one-time-code" : "current-password"}
              inputMode={isMember ? "numeric" : undefined}
              maxLength={isMember ? 4 : undefined}
              value={password}
              onChange={(e) =>
                setPassword(isMember ? e.target.value.replace(/\D/g, "").slice(0, 4) : e.target.value)
              }
              pattern={isMember ? "\\d{4}" : undefined}
              required
              className="lp-input"
            />
          </div>
          {error && <p className="lp-form-error" role="alert">{error}</p>}
          {message && <p className="lp-form-success" role="status">{message}</p>}

          <Button
            className="w-full mt-1"
            disabled={isPending}
            type="submit"
            style={{ background: "var(--brand)", color: "var(--primary-foreground)" }}
          >
            {isPending ? "Logging in…" : "Log in"}
          </Button>
          <button className="lp-forgot" disabled={isPending} onClick={onForgot} type="button">
            Forgot password?
          </button>
        </form>

        <p className="lp-modal-note">
          Secure access for members, trainers, and gym owners.
        </p>
      </DialogContent>
    </Dialog>
  );
}

// ─── Enquiry modal ────────────────────────────────────────────────────────────

function EnquiryModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [body, setBody] = useState("");

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name || !contact) { window.alert("Please provide a name and contact info."); return; }
    window.alert("Enquiry sent! We will reach out to you at " + contact + " shortly.");
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="lp-modal max-w-[420px] gap-0 p-7" showCloseButton={false}>
        <div className="lp-modal-hdr">
          <div className="lp-modal-brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/new_logo.png" alt="FitSplit" width="52" height="22" />
            <span>FitSplit</span>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            className="rounded-full text-muted-foreground"
            onClick={onClose}
            aria-label="Close"
            type="button"
          >
            ✕
          </Button>
        </div>

        <DialogHeader className="mt-2 mb-4 text-left gap-1">
          <DialogTitle className="lp-modal-title">Get in touch</DialogTitle>
          <DialogDescription className="lp-modal-sub">
            Tell us a bit about your gym and we&apos;ll get back to you with setup instructions.
          </DialogDescription>
        </DialogHeader>

        <form className="lp-modal-form" onSubmit={onSubmit}>
          <div className="lp-field">
            <Label htmlFor="enq-name">Name</Label>
            <Input id="enq-name" type="text" value={name} onChange={(e) => setName(e.target.value)} required className="lp-input" />
          </div>
          <div className="lp-field">
            <Label htmlFor="enq-contact">Contact (Email or Phone)</Label>
            <Input id="enq-contact" type="text" value={contact} onChange={(e) => setContact(e.target.value)} required className="lp-input" />
          </div>
          <div className="lp-field">
            <Label htmlFor="enq-body">Message (Optional)</Label>
            <textarea
              id="enq-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", borderRadius: "10px", padding: "10px 14px", color: "var(--text)", fontSize: "14px", outline: "none", resize: "none", width: "100%", fontFamily: "inherit" }}
            />
          </div>
          <Button
            type="submit"
            size="lg"
            className="w-full mt-2"
            style={{ background: "var(--brand)", color: "var(--primary-foreground)" }}
          >
            Send Enquiry
          </Button>
          <p className="lp-modal-note" style={{ marginTop: "12px" }}>
            We use your details only to respond to your enquiry. See our{" "}
            <Link href="/privacy" style={{ color: "var(--accent)" }}>Privacy Policy</Link>.
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Feature icons ────────────────────────────────────────────────────────────

function featIcon(icon: string) {
  if (icon === "dumbbell") return <DumbbellIcon size={20} />;
  if (icon === "calendar") return <CalendarIcon size={20} />;
  if (icon === "chart") return <BarChart3Icon size={20} />;
  return <UsersIcon size={20} />;
}

// ─── Dashboard mock ───────────────────────────────────────────────────────────

function L1_MockOwner() {
  return (
    <div className="l1-mock">
      <div className="l1-mock__chrome">
        <span /><span /><span />
        <div className="l1-mock__url">fitsplit.app/owner</div>
      </div>
      <div className="l1-mock__body">
        <div className="l1-mock__row">
          <strong>Good morning, Priya</strong>
          <span>3 things need your attention</span>
        </div>
        <div className="l1-mock__kpis">
          {[
            { l: "Renewals due",  v: "18", tone: "danger" },
            { l: "Plans pending", v: "23", tone: "accent" },
          ].map((k) => (
            <div key={k.l} className={`l1-mock__kpi l1-mock__kpi--${k.tone}`}>
              <small>{k.l}</small>
              <strong>{k.v}</strong>
            </div>
          ))}
        </div>
        <div className="l1-mock__list">
          {[
            { tag: "EXPIRED", who: "Rohan Mehta",  what: "Annual Pro · lapsed 4 days ago", tone: "danger" },
            { tag: "PAYMENT", who: "Ananya Bose",   what: "Half-year PT · ₹18,500",         tone: "warn"   },
            { tag: "NO PLAN", who: "Pari Saxena",   what: "Joined 11 days ago",              tone: "accent" },
          ].map((r) => (
            <div key={r.who} className={`l1-mock__action l1-mock__action--${r.tone} l1-mock__action--no-btn`}>
              <span className="l1-mock__action-tag">{r.tag}</span>
              <div>
                <strong>{r.who}</strong>
                <small>{r.what}</small>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Phone mock ───────────────────────────────────────────────────────────────

function L1_MockPhone() {
  const exercises = [
    { name: "Bench Press",     sub: "4 × 5–8 · 52.5kg",      done: true   },
    { name: "Incline DB Press",sub: "3 × 8–10 · 18kg",        done: true   },
    { name: "Overhead Press",  sub: "3 × 6–8 · ↑ try 27.5kg", active: true },
  ];
  return (
    <div className="l1-phone">
      <div className="l1-phone__notch" />
      <div className="l1-phone__body">
        <div className="l1-phone__head">
          <small>TODAY&apos;S SESSION</small>
          <strong>Day B · Push</strong>
          <span>Week 4 · 6 lifts · ~55m</span>
        </div>
        {exercises.map((ex) => (
          <div key={ex.name} className={`l1-phone__ex${ex.active ? " l1-phone__ex--active" : ""}`}>
            <span className={`l1-phone__check${ex.done ? " l1-phone__check--on" : ""}`}>
              {ex.done ? "✓" : ""}
            </span>
            <div>
              <strong>{ex.name}</strong>
              <small>{ex.sub}</small>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Nav ──────────────────────────────────────────────────────────────────────

function L1_Nav({ onLogin }: { onLogin: () => void }) {
  return (
    <header className="lpd-nav">
      <div className="lpd-container lpd-nav__inner">
        <a className="lpd-brand" href="#top">
          <span className="lpd-brand__mark">
            <BrandMark size={44} />
          </span>
          FitSplit
        </a>
        <nav className="lpd-nav__links">
          {LANDING_MOCK.nav.map((item) =>
            item === "About"
              ? <Link key={item} href="/about">{item}</Link>
              : <a key={item} href={`#l1-${item.toLowerCase().replace(/\s+/g, "-")}`}>{item}</a>
          )}
        </nav>
        <div className="lpd-nav__cta">
          <Button variant="outline" onClick={onLogin} className="rounded-full">Log in</Button>
        </div>
      </div>
    </header>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function L1_Hero({ onLogin }: { onLogin: () => void }) {
  const { hero } = LANDING_MOCK;
  return (
    <section className="l1-hero" id="top">
      <div className="lpd-container l1-hero__inner">
        <div>
          <Badge variant="outline" className="lpd-eyebrow mb-0 rounded-full border-border bg-card text-muted-foreground">
            <span className="lpd-pulse" />
            {hero.eyebrow}
          </Badge>
          <h1 className="l1-h1">
            {hero.h1}
            <br />
            <span className="l1-h1__accent">{hero.h1Accent}</span>
          </h1>
          <p className="l1-hero__sub">{hero.sub}</p>
          <div className="l1-hero__cta">
            <Button
              size="lg"
              className="lpd-btn--lg rounded-full font-bold"
              style={{ background: "var(--brand)", color: "var(--primary-foreground)" }}
              onClick={onLogin}
            >
              Log in <ArrowRightIcon size={14} />
            </Button>
          </div>
        </div>

        <div className="l1-hero__visual">
          <L1_MockOwner />
          <div className="l1-hero__phone">
            <L1_MockPhone />
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Features ─────────────────────────────────────────────────────────────────

function L1_Features() {
  return (
    <section className="lpd-section" id="l1-product">
      <div className="lpd-container">
        <div className="lpd-section-head">
          <span className="lpd-section-label">Features</span>
          <h2 className="lpd-h2">Everything a coaching gym needs.</h2>
          <p className="lpd-sub">One app for owners, trainers, and members — no stitching together spreadsheets and WhatsApp.</p>
        </div>
        <div className="l1-feat-grid">
          {LANDING_MOCK.features.map((f, i) => (
            <Card
              key={f.title}
              className="l1-feat gap-0 rounded-[18px] border-border bg-card p-0 shadow-none"
              data-reveal
              data-delay={String(i + 1)}
            >
              <CardContent className="p-[26px]">
                <div className="l1-feat__icon">{featIcon(f.icon)}</div>
                <span className="l1-feat__tag">{f.tag}</span>
                <h3 className="l1-feat__title">{f.title}</h3>
                <p className="l1-feat__body">{f.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── How it works ─────────────────────────────────────────────────────────────

function L1_HowItWorks() {
  return (
    <section className="lpd-section l1-how">
      <div className="lpd-container">
        <div className="lpd-section-head">
          <span className="lpd-section-label">How it works</span>
          <h2 className="lpd-h2">Live in under a week.</h2>
          <p className="lpd-sub">Import your member list, build your first templates, and you&apos;re delivering structured workouts.</p>
        </div>
        <div className="l1-steps">
          {LANDING_MOCK.steps.map((s, i) => (
            <Card
              key={s.n}
              className="l1-step gap-0 rounded-[16px] border-border bg-card p-0 shadow-none"
              data-reveal
              data-delay={String(i + 1)}
            >
              <CardContent className="p-[22px]">
                <Badge className="l1-step__num mb-[14px] rounded-full bg-transparent border-0 p-0 text-[13px] font-extrabold" style={{ color: "var(--brand)", background: "var(--brand-soft)" }}>
                  {s.n}
                </Badge>
                <h3 className="l1-step__label">{s.label}</h3>
                <p className="l1-step__body">{s.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── FAQ ──────────────────────────────────────────────────────────────────────

function L1_FAQ() {
  return (
    <section className="lpd-section lpd-section--tight" id="l1-faq">
      <div className="lpd-container">
        <div className="lpd-section-head lpd-section-head--left" style={{ maxWidth: 760 }}>
          <span className="lpd-section-label">FAQ</span>
          <h2 className="lpd-h2">Common questions.</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "64px", alignItems: "flex-start" }}>
          <Accordion type="single" collapsible className="l1-faq__list w-full max-w-full">
            {LANDING_MOCK.faq.map((item) => (
              <AccordionItem
                key={item.q}
                value={item.q}
                className="l1-faq__item mb-[6px] rounded-[14px] border border-border bg-card overflow-hidden last:border-b"
              >
                <AccordionTrigger className="px-[22px] py-[18px] text-[15px] font-semibold text-foreground no-underline hover:no-underline hover:bg-muted">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="px-[22px] pb-[18px] pt-0 text-[14px] text-muted-foreground leading-relaxed">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <Card className="gap-0 rounded-[24px] border-border bg-card p-0 shadow-none">
            <CardContent className="p-8">
              <h3 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px", color: "var(--text)" }}>Have another question?</h3>
              <p style={{ fontSize: "14px", color: "var(--text-soft)", marginBottom: "24px" }}>Send us a message and we&apos;ll get back to you shortly.</p>
              <form
                className="lp-modal-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  window.alert("Message sent to admin inbox!");
                  (e.target as HTMLFormElement).reset();
                }}
              >
                <div className="lp-field"><Label htmlFor="faq-name">Name</Label><Input id="faq-name" type="text" required className="lp-input" /></div>
                <div className="lp-field"><Label htmlFor="faq-email">Email</Label><Input id="faq-email" type="email" required className="lp-input" /></div>
                <div className="lp-field">
                  <Label htmlFor="faq-msg">Message</Label>
                  <textarea
                    id="faq-msg"
                    rows={4}
                    style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", borderRadius: "10px", padding: "10px 14px", color: "var(--text)", fontSize: "14px", outline: "none", resize: "none", width: "100%", fontFamily: "inherit" }}
                    required
                  />
                </div>
                <Button
                  type="submit"
                  size="lg"
                  className="w-full mt-2"
                  style={{ background: "var(--brand)", color: "var(--primary-foreground)" }}
                >
                  Send message
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

// ─── CTA banner ───────────────────────────────────────────────────────────────

function L1_CTA({ onLogin }: { onLogin: () => void }) {
  return (
    <section className="l1-cta">
      <div className="lpd-container">
        <div className="l1-cta__card">
          <div>
            <h2 className="lpd-h2">Built for gyms that deliver coaching, not just access.</h2>
            <p className="lpd-sub">14 days free. No card required. Live in under a week.</p>
          </div>
          <div className="l1-cta__btns">
            <Button
              size="lg"
              className="rounded-full font-bold"
              style={{ background: "var(--brand)", color: "var(--primary-foreground)" }}
              onClick={onLogin}
            >
              Log in <ArrowRightIcon size={14} />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function L1_Footer({ onEnquiry }: { onEnquiry: () => void }) {
  return (
    <footer className="lpd-foot">
      <div className="lpd-container">
        <div className="lpd-foot__grid">
          <div>
            <a className="lpd-brand" href="#top">
              <span className="lpd-brand__mark">
                <BrandMark size={44} />
              </span>
              FitSplit
            </a>
            <p className="lpd-foot__brand-blurb">Workout delivery, trainer coordination, member progress — one workspace.</p>
          </div>
          {[
            { h: "Product", items: ["Owner dashboard", "Trainer console", "Member app"] },
            { h: "Company", items: ["About"] },
            { h: "Support", items: ["Help center", "Contact", "Status", "Privacy", "Terms"] }
          ].map((col) => (
            <div key={col.h} className="lpd-foot__col">
              <h4>{col.h}</h4>
              <ul>
                {col.items.map((item) => {
                  if (item === "Help center") return <li key={item}><button className="lp-foot-btn" onClick={onEnquiry}>{item}</button></li>;
                  if (item === "Contact") return <li key={item}><button className="lp-foot-btn" onClick={() => window.alert("Write to: fitsplit.in@gmail.com")}>{item}</button></li>;
                  if (item === "Status") return <li key={item}><button className="lp-foot-btn" onClick={() => window.alert("All systems operational.")}>{item}</button></li>;
                  if (item === "Privacy") return <li key={item}><Link href="/privacy">{item}</Link></li>;
                  if (item === "Terms") return <li key={item}><Link href="/terms">{item}</Link></li>;
                  if (item === "About") return <li key={item}><Link href="/about">{item}</Link></li>;
                  return <li key={item}><a href="#">{item}</a></li>;
                })}
              </ul>
            </div>
          ))}
        </div>
        <div className="lpd-foot__bar">
          <span>© 2026 FitSplit · fitsplit.in</span>
          <span>
            Built in India · in collaboration with{" "}
            <a href="https://blumelabs.in" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)", textDecoration: "none" }}>Blume Labs</a>
          </span>
        </div>
      </div>
    </footer>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function LandingPageClient() {
  const [loginOpen, setLoginOpen] = useState(false);
  const [enquiryOpen, setEnquiryOpen] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "dark");
  }, []);

  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>("[data-reveal]");
    if (!els.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -48px 0px" }
    );

    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <>
      <div className="lpd l1">
        <L1_Nav onLogin={() => setLoginOpen(true)} />
        <L1_Hero onLogin={() => setLoginOpen(true)} />

        <div data-reveal>
          <L1_Features />
        </div>

        <div data-reveal>
          <L1_HowItWorks />
        </div>

        <div data-reveal>
          <L1_FAQ />
        </div>

        <div data-reveal>
          <L1_CTA onLogin={() => setLoginOpen(true)} />
        </div>

        <L1_Footer onEnquiry={() => setEnquiryOpen(true)} />
      </div>

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
      <EnquiryModal open={enquiryOpen} onClose={() => setEnquiryOpen(false)} />
    </>
  );
}
