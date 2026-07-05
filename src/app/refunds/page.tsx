import { LegalDocumentPage } from "@/components/legal-document-page";
import { getLegalDocument } from "@/lib/legal-documents";

const document = getLegalDocument("refunds");

export const metadata = {
  title: `${document.title} | FitSplit`,
  description: document.description
};

export default function RefundsPage() {
  return <LegalDocumentPage documentKey="refunds" />;
}

