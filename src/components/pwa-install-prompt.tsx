"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isStandalone() {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function PwaInstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(() => isStandalone());
  const [showIosHint] = useState(() => {
    if (typeof window === "undefined") return false;
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(userAgent);
    return isIos && !isStandalone();
  });
  const [isHiddenForSession, setIsHiddenForSession] = useState(false);

  useEffect(() => {
    const isLocalDevelopment =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname === "::1";

    if ("serviceWorker" in navigator) {
      if (isLocalDevelopment) {
        navigator.serviceWorker
          .getRegistrations()
          .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
          .catch(() => undefined);

        if ("caches" in window) {
          caches
            .keys()
            .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
            .catch(() => undefined);
        }

        return;
      }

      navigator.serviceWorker.register("/sw.js").catch((error) => {
        console.warn("FitSplit service worker registration failed", error);
      });
    }

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
      setIsInstalled(false);
      setIsHiddenForSession(false);
    }

    function handleInstalled() {
      setInstallEvent(null);
      setIsInstalled(true);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  if (isInstalled || isHiddenForSession || (!installEvent && !showIosHint)) {
    return null;
  }

  async function installApp() {
    if (!installEvent) {
      return;
    }

    await installEvent.prompt();
    const choice = await installEvent.userChoice;

    if (choice.outcome === "accepted") {
      setInstallEvent(null);
      setIsInstalled(true);
    }
  }

  return (
    <div className="pwa-install-banner" role="status">
      <div>
        <strong>Install FitSplit</strong>
        <span>
          {showIosHint
            ? "Use Share, then Add to Home Screen for a full-screen app."
            : "Add FitSplit to your device for quick gym access."}
        </span>
      </div>
      <div className="pwa-install-actions">
        {installEvent ? (
          <button className="button button-primary" onClick={installApp} type="button">
            Install App
          </button>
        ) : null}
        <button
          aria-label="Hide install prompt for this visit"
          className="button button-secondary"
          onClick={() => setIsHiddenForSession(true)}
          type="button"
        >
          Later
        </button>
      </div>
    </div>
  );
}
