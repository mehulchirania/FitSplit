import { LegalDocumentPage } from "@/components/legal-document-page";
import { getLegalDocument } from "@/lib/legal-documents";

const document = getLegalDocument("gym-dpa");

export const metadata = {
  title: `${document.title} | FitSplit`,
  description: document.description
};

export default function GymDpaPage() {
  return <LegalDocumentPage documentKey="gym-dpa" />;
}

