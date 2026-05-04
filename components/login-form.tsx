"use client";

import { useActionState } from "react";
import { loginUser, requestPasswordReset } from "@/lib/auth";

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginUser, null);
  const [resetState, forgotPasswordAction] = useActionState(requestPasswordReset, null);

  return (
    <form
      action={formAction}
      className="form-panel"
      style={{
        maxWidth: 420,
        width: "100%",
        margin: "0 auto",
        marginTop: "clamp(24px, 8vh, 80px)",
        padding: "clamp(24px, 5vw, 40px) clamp(20px, 4vw, 32px)",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: "clamp(20px, 4vw, 32px)", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <img
          alt="FitSplit"
          src="/icon-512.png"
          width="80"
          height="80"
          style={{ borderRadius: "18px", marginBottom: "16px", boxShadow: "var(--shadow-soft)" }}
        />
        <h1 style={{
          fontSize: "clamp(1.4rem, 4.5vw, 2rem)",
          lineHeight: 1.2,
          fontWeight: 700,
          margin: 0,
          letterSpacing: "-0.02em"
        }}>
          Welcome to FitSplit,<br />your workout companion.
        </h1>
      </div>

      <div className="builder-stack" style={{ gap: "14px" }}>
        <label style={{ display: "grid", gap: "6px" }}>
          <span className="eyebrow" style={{ margin: 0 }}>Username / Mobile Number</span>
          <input
            type="text"
            name="username"
            required
            autoComplete="username"
            placeholder="Enter username/mobile number"
            style={{
              padding: "12px 14px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border)",
              background: "var(--bg-elevated)",
              color: "var(--text)",
              fontSize: "1rem",
            }}
          />
        </label>

        <label style={{ display: "grid", gap: "6px" }}>
          <span className="eyebrow" style={{ margin: 0 }}>Password</span>
          <input
            type="password"
            name="password"
            required
            autoComplete="current-password"
            placeholder="password"
            style={{
              padding: "12px 14px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border)",
              background: "var(--bg-elevated)",
              color: "var(--text)",
              fontSize: "1rem",
            }}
          />
        </label>

        {state?.error && (
          <div style={{ padding: "10px 14px", background: "var(--danger-soft)", color: "var(--danger)", borderRadius: "var(--radius-sm)", fontSize: "0.88rem" }}>
            {state.error}
          </div>
        )}
        
        {resetState?.error && (
          <div style={{ padding: "10px 14px", background: "var(--danger-soft)", color: "var(--danger)", borderRadius: "var(--radius-sm)", fontSize: "0.88rem" }}>
            {resetState.error}
          </div>
        )}

        {resetState?.status === "success" && resetState?.message && (
          <div style={{ padding: "10px 14px", background: "var(--brand-soft)", color: "var(--brand-strong)", borderRadius: "var(--radius-sm)", fontSize: "0.88rem" }}>
            {resetState.message}
          </div>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="button button-primary"
          style={{ marginTop: "8px", width: "100%", padding: "14px", fontSize: "1rem" }}
        >
          {isPending ? "Logging in..." : "Log in"}
        </button>

        <button 
          formAction={forgotPasswordAction}
          className="button"
          style={{ width: "100%", padding: "12px", background: "none", border: "none", color: "var(--brand)", fontSize: "0.88rem", cursor: "pointer" }}
        >
          Forgot Password?
        </button>
      </div>
    </form>
  );
}
