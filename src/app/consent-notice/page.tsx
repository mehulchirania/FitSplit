import { LegalDocumentPage } from "@/components/legal-document-page";
import { getLegalDocument } from "@/lib/legal-documents";

const document = getLegalDocument("consent-notice");

export const metadata = {
  title: `${document.title} | FitSplit`,
  description: document.description
};

export default function ConsentNoticePage() {
  return <LegalDocumentPage documentKey="consent-notice" />;
}

