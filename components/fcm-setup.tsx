"use client";

/**
 * FcmSetup — mounts once for authenticated members.
 * Requests notification permission, retrieves the FCM token, and saves it to the user's
 * Firestore profile via the saveFcmToken server action.
 *
 * Renders nothing visible — it is a pure side-effect component.
 */

import { useEffect } from "react";
import { getToken } from "firebase/messaging";
import { saveFcmToken } from "@/lib/firebase/actions";
import { getFirebaseMessaging } from "@/lib/firebase/client";
import { initialFormActionState } from "@/types/action-state";

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

export function FcmSetup() {
  useEffect(() => {
    if (!VAPID_KEY) return;

    // We only request on "default" (not previously denied or granted).
    // On "granted" we still refresh the token in case it rotated.
    if (Notification.permission === "denied") return;

    let cancelled = false;

    async function setup() {
      try {
        const messaging = await getFirebaseMessaging();
        if (!messaging || cancelled) return;

        const permission = await Notification.requestPermission();
        if (permission !== "granted" || cancelled) return;

        const token = await getToken(messaging, {
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration: await navigator.serviceWorker.register(
            "/firebase-messaging-sw.js",
            { scope: "/" }
          )
        });

        if (!token || cancelled) return;

        const fd = new FormData();
        fd.set("token", token);
        await saveFcmToken(initialFormActionState, fd);
      } catch (err) {
        // Notification permission denied or unsupported browser — fail silently.
        console.debug("[FcmSetup] skipped:", err);
      }
    }

    setup();
    return () => { cancelled = true; };
  
  }, []);

  return null;
}
