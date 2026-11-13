// Slide copy for the mobile onboarding carousel. Each line states one
// concrete, real capability in the member's own words.
// Not marketing copy, not a generic feature-tour list.

import type { ComponentType } from "react";
import { Dumbbell, Video, Swap, Activity } from "@/components/icons";

export type OnboardingSlide = {
  id: string;
  icon: ComponentType<{ className?: string }>;
  title: string;
  body: string;
};

export const SLIDES: OnboardingSlide[] = [
  {
    id: "split",
    icon: Dumbbell,
    title: "Know today's work before you touch a plate",
    body:
      "Open Push Day A and see your exercises, target muscles, and sets × reps — no scrolling through a program PDF mid-workout."
  },
  {
    id: "form-video",
    icon: Video,
    title: "Watch the lift, right there",
    body:
      "Every exercise has a 1-tap form video. Unsure on a cable row? Watch it mid-set without leaving the screen."
  },
  {
    id: "swap",
    icon: Swap,
    title: "Machine's taken? Swap it.",
    body:
      "Every exercise offers same-muscle alternatives, so a taken machine never stalls your session."
  },
  {
    id: "log-progress",
    icon: Activity,
    title: "Log it, see it grow",
    body:
      "Track sets, meals and body weight in the same app you train with, then watch the trend build over time."
  }
];
