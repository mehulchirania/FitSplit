"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { submitContactMessage } from "@/lib/firebase/actions/contact";
import { initialFormActionState } from "@/types/action-state";

function CheckIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

const PERKS = [
  { strong: "Live in under a week", rest: " — import members from CSV, build templates once, reuse forever." },
  { strong: "Built for Indian gyms", rest: " — PIN logins for members, cash and UPI-friendly billing, works on any phone." },
  { strong: "No card required", rest: " — try it with your full member list during the trial." }
];

export function EnquirySection() {
  const [state, formAction, isPending] = useActionState(submitContactMessage, initialFormActionState);
  const notified = useRef(false);
  const fieldError = (key: string) => state.fieldErrors?.[key]?.[0];

  useEffect(() => {
    if (state.status === "success" && !notified.current) {
      notified.current = true;
      toast.success(state.message);
    }
  }, [state.status, state.message]);

  return (
    <section id="enquiry" className="lp-section">
      <div className="lp-container">
        <div className="lp-enquiry lp-reveal" data-reveal>
          <div>
            <span className="lp-eyebrow">Get FitSplit</span>
            <h2 className="lp-h2">Bring FitSplit to your gym.</h2>
            <p className="lp-lede">
              Tell us a little about your gym and we&apos;ll get back to you within a day — usually much sooner.
            </p>
            <ul className="lp-enquiry__perks">
              {PERKS.map((perk) => (
                <li key={perk.strong}>
                  <CheckIcon />
                  <span>
                    <strong>{perk.strong}</strong>
                    {perk.rest}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {state.status === "success" ? (
            <div className="lp-enquiry__done" role="status">
              <span className="lp-enquiry__done-icon">
                <CheckIcon size={22} />
              </span>
              <h3>Message sent</h3>
              <p>
                Thanks for reaching out — we&apos;ve got your details and will contact you shortly to set up your
                gym&apos;s workspace.
              </p>
            </div>
          ) : (
            <form className="lp-form" action={formAction}>
              <div className="lp-form__grid">
                <div className="lp-field">
                  <label htmlFor="lp-enq-name">Your name</label>
                  <input id="lp-enq-name" name="name" type="text" autoComplete="name" required />
                  {fieldError("name") && <p className="lp-field__error">{fieldError("name")}</p>}
                </div>
                <div className="lp-field">
                  <label htmlFor="lp-enq-mobile">Mobile number</label>
                  <input id="lp-enq-mobile" name="mobile" type="tel" inputMode="tel" autoComplete="tel" required />
                  {fieldError("mobile") && <p className="lp-field__error">{fieldError("mobile")}</p>}
                </div>
              </div>
              <div className="lp-field">
                <label htmlFor="lp-enq-email">Email (optional)</label>
                <input id="lp-enq-email" name="email" type="email" autoComplete="email" />
                {fieldError("email") && <p className="lp-field__error">{fieldError("email")}</p>}
              </div>
              <div className="lp-field">
                <label htmlFor="lp-enq-body">About your gym</label>
                <textarea
                  id="lp-enq-body"
                  name="body"
                  required
                  minLength={10}
                  placeholder="Gym name, roughly how many members, and what you'd like to improve."
                />
                {fieldError("body") && <p className="lp-field__error">{fieldError("body")}</p>}
              </div>

              {state.status === "error" && !state.fieldErrors && (
                <p className="lp-form__error" role="alert">
                  {state.message}
                </p>
              )}

              <button type="submit" className="lp-btn lp-btn--primary lp-btn--lg" disabled={isPending}>
                {isPending ? "Sending…" : "Request a walkthrough"}
              </button>
              <p className="lp-form__note">We only use your details to get in touch about FitSplit. No spam.</p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
