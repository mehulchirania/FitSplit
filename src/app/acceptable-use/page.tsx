import { LegalDocumentPage } from "@/components/legal-document-page";
import { getLegalDocument } from "@/lib/legal-documents";

const document = getLegalDocument("acceptable-use");

export const metadata = {
  title: `${document.title} | FitSplit`,
  description: document.description
};

export default function AcceptableUsePage() {
  return <LegalDocumentPage documentKey="acceptable-use" />;
}

