"use client";

import { useEffect } from "react";

export function ScrollReveal() {
  useEffect(() => {
    const root = document.documentElement;
    const elements = Array.from(
      document.querySelectorAll<HTMLElement>(
        [
          ".landing-proof",
          ".landing-section",
          ".landing-role-grid article",
          ".landing-flow-grid article",
          ".landing-feature-grid article",
          ".landing-product-grid article",
          ".landing-bento-grid article",
          ".landing-timeline article",
          ".before-after-grid article",
          ".about-contact-grid article",
          ".about-contact-grid aside",
          ".landing-demo-card",
          ".landing-final-cta",
          ".intro-login-band"
        ].join(", ")
      )
    );

    if (!elements.length || !("IntersectionObserver" in window)) {
      root.classList.remove("scroll-reveal-ready");
      return;
    }

    root.classList.add("scroll-reveal-ready");

    elements.forEach((element, index) => {
      element.classList.add("reveal-on-scroll");
      element.style.setProperty("--reveal-delay", `${(index % 3) * 55}ms`);
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          entry.target.classList.toggle("is-visible", entry.isIntersecting);
        });
      },
      {
        rootMargin: "-10% 0px -10% 0px",
        threshold: 0.12
      }
    );

    elements.forEach((element) => observer.observe(element));

    return () => {
      observer.disconnect();
      elements.forEach((element) => {
        element.classList.remove("reveal-on-scroll", "is-visible");
        element.style.removeProperty("--reveal-delay");
      });
      root.classList.remove("scroll-reveal-ready");
    };
  }, []);

  return null;
}
