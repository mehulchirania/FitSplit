export type LegalDocumentKey =
  | "terms"
  | "privacy"
  | "cookies"
  | "acceptable-use"
  | "health-disclaimer"
  | "data-rights"
  | "consent-notice"
  | "subprocessors";

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
    description: "The terms that govern your FitSplit account, your content, and liability."
  },
  {
    key: "privacy",
    title: "Privacy Notice",
    href: "/privacy",
    source: "privacy-policy.md",
    description: "What personal data FitSplit collects, why, how long we keep it, who processes it, and your rights."
  },
  {
    key: "cookies",
    title: "Cookie Policy",
    href: "/cookies",
    source: "cookie-policy.md",
    description: "The cookies and browser storage FitSplit uses. Essential only; no advertising or tracking cookies."
  },
  {
    key: "acceptable-use",
    title: "Acceptable Use Policy",
    href: "/acceptable-use",
    source: "acceptable-use-policy.md",
    description: "Rules for safe and lawful use of FitSplit."
  },
  {
    key: "health-disclaimer",
    title: "Health and Fitness Disclaimer",
    href: "/health-disclaimer",
    source: "health-and-fitness-disclaimer.md",
    description: "Important medical, workout, nutrition, and exercise-risk disclaimers."
  },
  {
    key: "data-rights",
    title: "Data Rights and Grievance Notice",
    href: "/data-rights",
    source: "data-rights-and-grievance-notice.md",
    description: "How to access, correct, erase or export your data, withdraw consent, nominate someone, or raise a grievance."
  },
  {
    key: "consent-notice",
    title: "Consent Notice",
    href: "/consent-notice",
    source: "consent-notice.md",
    description: "Plain-language summary of what you agree to when you create an account."
  },
  {
    key: "subprocessors",
    title: "Subprocessor List",
    href: "/subprocessors",
    source: "subprocessors.md",
    description: "The service providers that process personal data for FitSplit."
  }
];

export function getLegalDocument(key: LegalDocumentKey) {
  const document = LEGAL_DOCUMENTS.find((item) => item.key === key);
  if (!document) {
    throw new Error(`Unknown legal document: ${key}`);
  }
  return document;
}

