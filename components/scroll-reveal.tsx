"use client";

import { useEffect } from "react";

export function ScrollReveal() {
  useEffect(() => {
    document.documentElement.classList.remove("scroll-reveal-ready");
  }, []);

  return null;
}
