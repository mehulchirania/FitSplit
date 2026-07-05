import { LegalDocumentPage } from "@/components/legal-document-page";
import { getLegalDocument } from "@/lib/legal-documents";

const document = getLegalDocument("health-disclaimer");

export const metadata = {
  title: `${document.title} | FitSplit`,
  description: document.description
};

export default function HealthDisclaimerPage() {
  return <LegalDocumentPage documentKey="health-disclaimer" />;
}

