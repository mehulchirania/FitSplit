export const LEGAL_CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_FITSPLIT_LEGAL_EMAIL?.trim() || "fitsplit.in@gmail.com";

export const LEGAL_OPERATOR_NAME =
  process.env.NEXT_PUBLIC_FITSPLIT_LEGAL_NAME?.trim() || "FitSplit";

const LEGAL_OPERATOR_ADDRESS =
  process.env.NEXT_PUBLIC_FITSPLIT_LEGAL_ADDRESS?.trim() || "India";

export const LEGAL_OPERATOR_LINE = `${LEGAL_OPERATOR_NAME}, ${LEGAL_OPERATOR_ADDRESS}`;
