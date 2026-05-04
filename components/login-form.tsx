"use client";

import { useActionState } from "react";
import { loginUser, requestPasswordReset } from "@/lib/auth";

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginUser, null);
  const [resetState, forgotPasswordAction] = useActionState(requestPasswordReset, null);

  return (
    <form action={formAction} className="form-panel" style={{ maxWidth: 450, margin: "0 auto", marginTop: "10vh", padding: "40px 32px" }}>
      <div style={{ textAlign: "center", marginBottom: "32px", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <img
          alt="FitSplit"
          src="/icon-512.png"
          width="96"
          height="96"
          style={{ borderRadius: "18px", marginBottom: "20px" }}
        />
        <h1 style={{ fontSize: "2rem", lineHeight: 1.2, fontWeight: 700, margin: 0, letterSpacing: "-0.02em" }}>
          Welcome to FitSplit,<br />your workout companion.
        </h1>
      </div>

      <div className="builder-stack">
        <label style={{ display: "grid", gap: "6px" }}>
          <span className="eyebrow" style={{ margin: 0 }}>Username / Mobile Number</span>
          <input
            type="text"
            name="username"
            required
            placeholder="Enter username/mobile number"
            style={{
              padding: "12px",
              borderRadius: "8px",
              border: "1px solid var(--border)",
              background: "var(--bg-elevated)",
              color: "var(--text)",
            }}
          />
        </label>

        <label style={{ display: "grid", gap: "6px" }}>
          <span className="eyebrow" style={{ margin: 0 }}>Password</span>
          <input
            type="password"
            name="password"
            required
            placeholder="password"
            style={{
              padding: "12px",
              borderRadius: "8px",
              border: "1px solid var(--border)",
              background: "var(--bg-elevated)",
              color: "var(--text)",
            }}
          />
        </label>

        {state?.error && (
          <div style={{ padding: "10px", background: "var(--danger-soft)", color: "var(--danger)", borderRadius: "8px", fontSize: "0.9rem", marginTop: "8px" }}>
            {state.error}
          </div>
        )}
        
        {resetState?.error && (
          <div style={{ padding: "10px", background: "var(--danger-soft)", color: "var(--danger)", borderRadius: "8px", fontSize: "0.9rem", marginTop: "8px" }}>
            {resetState.error}
          </div>
        )}

        {resetState?.status === "success" && resetState?.message && (
          <div style={{ padding: "10px", background: "var(--success-soft)", color: "var(--success)", borderRadius: "8px", fontSize: "0.9rem", marginTop: "8px" }}>
            {resetState.message}
          </div>
        )}


        <button
          type="submit"
          disabled={isPending}
          className="button button-primary"
          style={{ marginTop: "16px", width: "100%", padding: "14px", fontSize: "1rem" }}
        >
          {isPending ? "Logging in..." : "Log in"}
        </button>

        <button 
          formAction={forgotPasswordAction}
          className="button"
          style={{ marginTop: "8px", width: "100%", padding: "14px", background: "none", border: "none", color: "var(--primary)", fontSize: "0.9rem", cursor: "pointer" }}
        >
          Forgot Password?
        </button>
      </div>
    </form>
  );
}
