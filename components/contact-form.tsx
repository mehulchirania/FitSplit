"use client";

import { useActionState } from "react";
import { submitContactMessage } from "@/lib/firebase/actions";
import { FormActionState } from "@/types/action-state";

const initialState: FormActionState = {
  status: "idle",
  message: ""
};

export function ContactForm() {
  const [state, formAction, isPending] = useActionState(submitContactMessage, initialState);

  return (
    <div className="contact-form-panel">
      <form action={formAction} className="contact-form">
        <div className="contact-form-grid">
          <label>
            <span>Name</span>
            <input
              name="name"
              placeholder="Your name"
              required
              type="text"
            />
          </label>
          <label>
            <span>Mobile number</span>
            <input
              name="mobile"
              inputMode="tel"
              pattern="(\\+91[\\s-]?)?[6-9][0-9]{9}"
              placeholder="10-digit number"
              required
              type="tel"
            />
          </label>
        </div>

        <label>
          <span>Email <small>optional</small></span>
          <input
            name="email"
            placeholder="your@email.com"
            type="email"
          />
        </label>

        <label>
          <span>Message</span>
          <textarea
            name="body"
            minLength={10}
            placeholder="How can we help?"
            required
            rows={4}
          />
        </label>

        {state.status === "error" && (
          <p className="form-message form-message-error">{state.message}</p>
        )}
        {state.status === "success" && (
          <p className="form-message form-message-success">{state.message}</p>
        )}

        <button
          className="button button-primary"
          disabled={isPending}
          type="submit"
        >
          {isPending ? "Sending..." : "Send Message"}
        </button>
      </form>
    </div>
  );
}
