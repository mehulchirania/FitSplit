/**
 * Phone-number + PIN identity.
 *
 * FitSplit users sign in with a mobile number and a 4-digit PIN. Firebase Auth has
 * no such credential, so under the hood each account is an email/password user with
 * a synthetic identity derived here. Users never see or type the email, and nothing
 * is ever sent to it. This file is the ONLY place the derivation lives, and it uses
 * no aliases or runtime-only syntax so scripts/seed-emulator.mjs can import it too.
 */

export const PIN_LENGTH = 4;

/** Domain of the synthetic Firebase Auth email. Not a real mailbox. */
export const PHONE_EMAIL_DOMAIN = "phone.fitsplit.app";

const DEFAULT_COUNTRY_CODE = "91";

/**
 * Normalise what a person typed into E.164 ("+919688227039"), or null if it can't be
 * a mobile number. A bare 10-digit number (optionally with a leading 0 or 91) is
 * treated as Indian; anything else must carry its own "+countrycode".
 */
export function normalizePhone(input: string): string | null {
  const raw = String(input ?? "").trim();
  const hasPlus = raw.startsWith("+") || raw.startsWith("00");
  let digits = raw.replace(/\D/g, "");
  if (raw.startsWith("00")) digits = digits.slice(2);
  if (!digits) return null;

  if (!hasPlus) {
    if (digits.length === 10) digits = DEFAULT_COUNTRY_CODE + digits;
    else if (digits.length === 11 && digits.startsWith("0")) digits = DEFAULT_COUNTRY_CODE + digits.slice(1);
    else if (digits.length === 12 && digits.startsWith(DEFAULT_COUNTRY_CODE)) {
      /* already country-coded, just missing the "+" */
    } else return null;
  }

  // Indian mobile numbers are 10 digits starting 6-9.
  if (digits.startsWith(DEFAULT_COUNTRY_CODE)) {
    return /^91[6-9]\d{9}$/.test(digits) ? `+${digits}` : null;
  }
  // E.164: at most 15 digits, first digit non-zero. 8 is the shortest real subscriber number.
  return /^[1-9]\d{7,14}$/.test(digits) ? `+${digits}` : null;
}

/** The synthetic Firebase Auth email for an E.164 number. */
export function phoneToEmail(e164: string): string {
  return `${e164.replace(/\D/g, "")}@${PHONE_EMAIL_DOMAIN}`;
}

/** Reverse of phoneToEmail; null for any other email. */
export function emailToPhone(email: string | undefined | null): string | null {
  const match = /^(\d{8,15})@phone\.fitsplit\.app$/i.exec(String(email ?? "").trim());
  return match ? `+${match[1]}` : null;
}

export function isValidPin(pin: string): boolean {
  return /^\d{4}$/.test(String(pin ?? ""));
}

/** Firebase needs 6+ characters, so the PIN is prefixed. Never sent to the client. */
export function pinToPassword(pin: string): string {
  return `fs-pin-${pin}`;
}

/** "+919688227039" -> "+91 96882 27039", for display. */
export function formatPhone(e164: string): string {
  const m = /^\+91(\d{5})(\d{5})$/.exec(e164);
  return m ? `+91 ${m[1]} ${m[2]}` : e164;
}
