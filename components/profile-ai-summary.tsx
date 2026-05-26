/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useState } from "react";
import { generateWorkoutSummary } from "@/lib/ai";
import { Activity } from "@/components/icons";

export function ProfileAiSummary({ memberId }: { memberId: string }) {
  const [summary, setSummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleGenerate() {
    setIsLoading(true);
    try {
      const result = await generateWorkoutSummary(memberId);
      setSummary(result ?? "AI could not generate a summary at this time.");
    } catch (e) {
      setSummary("An error occurred while generating the insight.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="list-panel" style={{ marginTop: 24 }}>
      <div className="panel-title">
        <h2>
          <Activity /> AI Progress Insight
        </h2>
        <span className="status-pill status-active">Powered by Gemini</span>
      </div>
      <div className="busyness-widget" style={{ textAlign: "left", alignItems: "flex-start", padding: "24px" }}>
        {!summary && !isLoading && (
          <div style={{ textAlign: "center", width: "100%" }}>
            <p style={{ marginBottom: 16 }}>
              Get a personalized breakdown of your recent lift history from your AI Semi-Personal Trainer.
            </p>
            <button className="button button-primary" onClick={handleGenerate} type="button">
              Generate AI Insight
            </button>
          </div>
        )}

        {isLoading && (
          <div style={{ textAlign: "center", width: "100%", padding: "24px 0" }}>
            <p className="eyebrow" style={{ animation: "pulse 1.5s infinite" }}>Analyzing lift logs...</p>
          </div>
        )}

        {summary && !isLoading && (
          <div style={{ width: "100%" }}>
            <div style={{ whiteSpace: "pre-line", lineHeight: 1.6 }}>{summary}</div>
            <button 
              className="button button-secondary" 
              onClick={handleGenerate} 
              type="button"
              style={{ marginTop: 24 }}
            >
              Regenerate Insight
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
