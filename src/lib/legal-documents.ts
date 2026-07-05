export type LegalDocumentKey =
  | "terms"
  | "privacy"
  | "cookies"
  | "acceptable-use"
  | "health-disclaimer"
  | "refunds"
  | "data-rights"
  | "consent-notice"
  | "subprocessors"
  | "gym-dpa";

export type LegalDocumentMeta = {
  key: LegalDocumentKey;
  title: string;
  href: string;
  source: string;
  description: string;
};

export const LEGAL_DOCUMENTS: LegalDocumentMeta[] = [
  {
    key: "terms",
    title: "Terms of Service",
    href: "/terms",
    source: "terms-of-service.md",
    description: "The terms that govern FitSplit accounts, roles, gym use, content, billing records, and liability."
  },
  {
    key: "privacy",
    title: "Privacy Policy",
    href: "/privacy",
    source: "privacy-policy.md",
    description: "How FitSplit collects, uses, shares, protects, and retains personal, fitness, and gym data."
  },
  {
    key: "cookies",
    title: "Cookie Policy",
    href: "/cookies",
    source: "cookie-policy.md",
    description: "How FitSplit uses essential cookies, local storage, offline app data, and push tokens."
  },
  {
    key: "acceptable-use",
    title: "Acceptable Use Policy",
    href: "/acceptable-use",
    source: "acceptable-use-policy.md",
    description: "Rules for safe, lawful, and authorized use of the FitSplit platform."
  },
  {
    key: "health-disclaimer",
    title: "Health and Fitness Disclaimer",
    href: "/health-disclaimer",
    source: "health-and-fitness-disclaimer.md",
    description: "Important medical, workout, nutrition, trainer, and exercise-risk disclaimers."
  },
  {
    key: "refunds",
    title: "Refund and Cancellation Policy",
    href: "/refunds",
    source: "refund-and-cancellation-policy.md",
    description: "How member payments, gym memberships, cancellations, and FitSplit platform fees are handled."
  },
  {
    key: "data-rights",
    title: "Data Rights and Grievance Notice",
    href: "/data-rights",
    source: "data-rights-and-grievance-notice.md",
    description: "How users can request access, export, correction, deletion, consent withdrawal, or grievance review."
  },
  {
    key: "consent-notice",
    title: "Consent Notice",
    href: "/consent-notice",
    source: "consent-notice.md",
    description: "Short-form consent language for first login, location attendance, notifications, and gym onboarding."
  },
  {
    key: "subprocessors",
    title: "Subprocessor List",
    href: "/subprocessors",
    source: "subprocessors.md",
    description: "Third-party service providers that may process data for FitSplit."
  },
  {
    key: "gym-dpa",
    title: "Gym Data Processing Addendum",
    href: "/gym-dpa",
    source: "gym-data-processing-addendum.md",
    description: "B2B data-processing terms for gyms using FitSplit with member and staff data."
  }
];

export function getLegalDocument(key: LegalDocumentKey) {
  const document = LEGAL_DOCUMENTS.find((item) => item.key === key);
  if (!document) {
    throw new Error(`Unknown legal document: ${key}`);
  }
  return document;
}

