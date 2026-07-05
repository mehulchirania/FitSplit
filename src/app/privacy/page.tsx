import { LegalDocumentPage } from "@/components/legal-document-page";
import { getLegalDocument } from "@/lib/legal-documents";

const document = getLegalDocument("privacy");

export const metadata = {
  title: `${document.title} | FitSplit`,
  description: document.description
};

export default function PrivacyPage() {
  return <LegalDocumentPage documentKey="privacy" />;
}
