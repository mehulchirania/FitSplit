"use client";

import { useState } from "react";

const navLinks = [
  { href: "#about", label: "About" },
  { href: "#demo", label: "Demo" },
  { href: "#login", label: "Login" }
];

export function LandingNav() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="landing-nav" aria-label="FitSplit landing navigation">
      <a className="landing-nav-brand" href="#top" aria-label="FitSplit home">
        <span className="theme-logo" aria-hidden="true">
          <img alt="" className="theme-logo-dark" src="/fitsplit-logo-dark.png" />
          <img alt="" className="theme-logo-light" src="/fitsplit-logo-light.png" />
        </span>
        <span>FitSplit</span>
      </a>

      <button
        aria-expanded={isOpen}
        aria-label="Open menu"
        className="landing-menu-button"
        onClick={() => setIsOpen((value) => !value)}
        type="button"
      >
        <span />
        <span />
        <span />
      </button>

      <div className={`landing-nav-links ${isOpen ? "is-open" : ""}`}>
        {navLinks.map((link) => (
          <a href={link.href} key={link.href} onClick={() => setIsOpen(false)}>
            {link.label}
          </a>
        ))}
        <a className="landing-nav-login" href="#login" onClick={() => setIsOpen(false)}>
          Start Demo
        </a>
      </div>
    </nav>
  );
}
