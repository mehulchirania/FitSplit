/**
 * Single source of truth for every legal/contact detail and version string.
 *
 * - Legal pages (legal/*.md) reference these as {{TOKENS}}; the renderer in
 *   components/legal-document-page.tsx substitutes them, so nothing is duplicated.
 * - Signup stores the document versions + a timestamp on the user profile as the consent record.
 *
 * Values in [SQUARE BRACKETS] are PLACEHOLDERS the owner must replace before launch.
 * Do not invent a person or address here; use the real ones.
 */

/** Date every policy was last revised (ISO). Bump together with the relevant version. */
export const LEGAL_LAST_UPDATED = "2026-11-14";

/** Bump a version whenever the document materially changes; users re-consent on material change. */
export const LEGAL_VERSIONS = {
  terms: "2.1",
  privacy: "2.1",
  cookies: "2.0",
  "acceptable-use": "2.0",
  "health-disclaimer": "2.0",
  "data-rights": "2.1",
  "consent-notice": "2.1",
  subprocessors: "2.0"
} as const;

export type LegalVersionKey = keyof typeof LEGAL_VERSIONS;

/** Operator (the Data Fiduciary under the DPDP Act). */
const OPERATOR = {
  name: "Blume Labs",
  legalForm: "[LEGAL FORM, e.g. proprietorship / LLP / private limited]",
  registeredAddress: "[REGISTERED ADDRESS]",
  /** City whose courts have jurisdiction under the Terms. */
  jurisdictionCity: "[CITY, STATE]"
} as const;

/** Grievance Officer / Data Protection contact. Rendered on the privacy and data-rights pages. */
const DATA_PROTECTION_CONTACT = {
  name: "[NAME]",
  designation: "[DESIGNATION]",
  email: "[privacy@yourdomain]",
  postalAddress: "[POSTAL ADDRESS]",
  /** Commitments the policies make. Change here and every page follows. */
  acknowledgeWithinDays: 7,
  respondWithinDays: 30
} as const;

/** Where Firebase data lives. Confirm against the Firebase console, then replace. */
const DATA_LOCATION = "[CONFIRM: Firestore and Storage location, e.g. Mumbai (asia-south1)]";

/** Age of majority for consent purposes (DPDP Act s.2(f): under 18 is a child). */
export const ADULT_AGE = 18;

/** Tokens available inside the markdown pages as {{TOKEN}}. */
export function legalTokens(documentKey: LegalVersionKey): Record<string, string> {
  return {
    LAST_UPDATED: LEGAL_LAST_UPDATED,
    VERSION: LEGAL_VERSIONS[documentKey],
    OPERATOR_NAME: OPERATOR.name,
    OPERATOR_LEGAL_FORM: OPERATOR.legalForm,
    OPERATOR_ADDRESS: OPERATOR.registeredAddress,
    JURISDICTION_CITY: OPERATOR.jurisdictionCity,
    CONTACT_NAME: DATA_PROTECTION_CONTACT.name,
    CONTACT_DESIGNATION: DATA_PROTECTION_CONTACT.designation,
    CONTACT_EMAIL: DATA_PROTECTION_CONTACT.email,
    CONTACT_ADDRESS: DATA_PROTECTION_CONTACT.postalAddress,
    ACK_DAYS: String(DATA_PROTECTION_CONTACT.acknowledgeWithinDays),
    RESPONSE_DAYS: String(DATA_PROTECTION_CONTACT.respondWithinDays),
    DATA_LOCATION
  };
}

/** Replace {{TOKEN}}s; an unknown token throws so a typo fails the build instead of shipping. */
export function applyLegalTokens(markdown: string, tokens: Record<string, string>): string {
  return markdown.replace(/\{\{([A-Z_]+)\}\}/g, (_match, key: string) => {
    if (!(key in tokens)) throw new Error(`Unknown legal token {{${key}}}`);
    return tokens[key];
  });
}

/** The consent record written to users/{uid}.consent at signup. */
export type ConsentRecord = {
  termsVersion: string;
  privacyVersion: string;
  acceptedAt: string;
  ageGroup: "adult" | "minor";
  /** Optional, separate consent. Never required to use the app. */
  diagnostics: { granted: boolean; updatedAt: string };
  /** Present only for under-18 accounts (DPDP Act s.9). */
  guardian?: {
    email: string;
    declaredAt: string;
    /** "pending" until the guardian confirms; nothing sets "verified" yet. */
    verification: "pending" | "verified";
  };
};

export function buildConsentRecord(input: {
  ageGroup: "adult" | "minor";
  diagnostics: boolean;
  guardianEmail?: string;
  now?: Date;
}): ConsentRecord {
  const at = (input.now ?? new Date()).toISOString();
  const minor = input.ageGroup === "minor";
  return {
    termsVersion: LEGAL_VERSIONS.terms,
    privacyVersion: LEGAL_VERSIONS.privacy,
    acceptedAt: at,
    ageGroup: input.ageGroup,
    // No behavioural monitoring of children (DPDP s.9(3)): diagnostics are forced off for minors.
    diagnostics: { granted: minor ? false : input.diagnostics, updatedAt: at },
    ...(minor && input.guardianEmail
      ? { guardian: { email: input.guardianEmail, declaredAt: at, verification: "pending" as const } }
      : {})
  };
}
