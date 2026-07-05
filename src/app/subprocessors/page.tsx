import { LegalDocumentPage } from "@/components/legal-document-page";
import { getLegalDocument } from "@/lib/legal-documents";

const document = getLegalDocument("subprocessors");

export const metadata = {
  title: `${document.title} | FitSplit`,
  description: document.description
};

export default function SubprocessorsPage() {
  return <LegalDocumentPage documentKey="subprocessors" />;
}

