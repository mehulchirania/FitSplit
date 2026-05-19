"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const TRAINING_NOTES = [
  "Aim for 8,000-10,000 steps per day.",
  "For low-impact cardio, use an incline walk.",
  "Build nutrition around adequate protein, hydration, and fiber.",
  "Discuss supplements with your trainer before use.",
  "Training guidance should be personalized."
];

const GYM_RULES = [
  "Bring your own towel to wipe down equipment.",
  "No outdoor footwear on the gym floor.",
  "Please rerack all weights after use.",
  "Consult a trainer before heavy or risky lifts.",
  "Keep bags inside lockers or cabinets."
];

function TextRotateBlock({ 
  title, 
  items, 
  intervalMs = 4000, 
  colorClass 
}: { 
  title: string, 
  items: string[], 
  intervalMs?: number, 
  colorClass: string 
}) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIdx(prev => (prev + 1) % items.length);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [items.length, intervalMs]);

  return (
    <div className="text-rotate-block">
      <div className="trb-header">
         <span className={`trb-dot ${colorClass}`}></span>
         <h2>{title}</h2>
      </div>
      <div className="trb-viewport">
        <AnimatePresence mode="popLayout">
          <motion.p
            key={idx}
            initial={{ opacity: 0, y: 30, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -30, filter: "blur(4px)" }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="trb-text"
          >
            {items[idx]}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}

export function AppFooter() {
  return (
    <footer className="app-footer app-footer-stacked">
      <div className="trb-container">
        <TextRotateBlock title="Training Notes" items={TRAINING_NOTES} intervalMs={5000} colorClass="bg-brand" />
        <TextRotateBlock title="Gym Rules" items={GYM_RULES} intervalMs={5000} colorClass="bg-warning" />
      </div>
      <p className="app-footer-credit">Developed with 💪 by Mehul</p>
    </footer>
  );
}
