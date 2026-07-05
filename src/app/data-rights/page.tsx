import { LegalDocumentPage } from "@/components/legal-document-page";
import { getLegalDocument } from "@/lib/legal-documents";

const document = getLegalDocument("data-rights");

export const metadata = {
  title: `${document.title} | FitSplit`,
  description: document.description
};

export default function DataRightsPage() {
  return <LegalDocumentPage documentKey="data-rights" />;
}

