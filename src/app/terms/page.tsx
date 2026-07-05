import { LegalDocumentPage } from "@/components/legal-document-page";
import { getLegalDocument } from "@/lib/legal-documents";

const document = getLegalDocument("terms");

export const metadata = {
  title: `${document.title} | FitSplit`,
  description: document.description
};

export default function TermsPage() {
  return <LegalDocumentPage documentKey="terms" />;
}
