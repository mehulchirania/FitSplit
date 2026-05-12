"use client";

import { useEffect, useRef, useState } from "react";
import { ThemeToggle } from "./theme-toggle";

const navLinks = [
  { href: "#top", label: "Home" },
  { href: "#features", label: "Features" },
  { href: "#partners", label: "Partners" },
  { href: "#contact", label: "Contact" },
  { href: "#login", label: "Login" }
];

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export function LandingNav() {
  const [isOpen, setIsOpen] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const lastScrollYRef = useRef(0);

  useEffect(() => {
    lastScrollYRef.current = window.scrollY;

    function handleScroll() {
      const currentScrollY = window.scrollY;
      const delta = currentScrollY - lastScrollYRef.current;

      if (isOpen || currentScrollY < 48) {
        setIsHidden(false);
      } else if (delta > 8) {
        setIsHidden(true);
      } else if (delta < -8) {
        setIsHidden(false);
      }

      lastScrollYRef.current = currentScrollY;
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isOpen]);

  useEffect(() => {
    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    }

    function handleInstalled() {
      setInstallEvent(null);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  async function installApp() {
    if (!installEvent) {
      return;
    }

    await installEvent.prompt();
    const choice = await installEvent.userChoice;

    if (choice.outcome === "accepted") {
      setInstallEvent(null);
    }
  }

  return (
    <nav className={`landing-nav ${isHidden ? "landing-nav-hidden" : ""}`} aria-label="FitSplit landing navigation">
      <a className="landing-nav-brand" href="#top" aria-label="FitSplit home">
        <span className="theme-logo" aria-hidden="true">
          <img alt="" className="theme-logo-dark" src="/fitsplit-logo-dark.png" />
          <img alt="" className="theme-logo-light" src="/fitsplit-logo-light.png" />
        </span>
        <span>FitSplit</span>
      </a>

      <div className="landing-nav-actions" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <button
          aria-expanded={isOpen}
          aria-label="Open menu"
          className="landing-menu-button landing-menu-button-fixed"
          onClick={() => setIsOpen((value) => !value)}
          type="button"
        >
          <span className="landing-menu-glyph" aria-hidden="true">Menu</span>
          <span />
          <span />
          <span />
        </button>
      </div>

      <div className={`landing-nav-links ${isOpen ? "is-open" : ""}`}>
        <div className="landing-menu-theme">
          <span>Theme</span>
          <ThemeToggle />
        </div>
        {navLinks.map((link) => (
          <a href={link.href} key={link.href} onClick={() => setIsOpen(false)}>
            {link.label}
          </a>
        ))}
        <button className="landing-install-button" disabled={!installEvent} onClick={installApp} type="button">
          Install App
        </button>
        <a className="landing-nav-login" href="#login" onClick={() => setIsOpen(false)}>
          Start Demo
        </a>
      </div>
    </nav>
  );
}
