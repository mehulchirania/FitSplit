import { LegalDocumentPage } from "@/components/legal-document-page";
import { getLegalDocument } from "@/lib/legal-documents";

const document = getLegalDocument("cookies");

export const metadata = {
  title: `${document.title} | FitSplit`,
  description: document.description
};

export default function CookiePolicyPage() {
  return <LegalDocumentPage documentKey="cookies" />;
}

