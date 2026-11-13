import { LegalDocumentPage } from "@/components/legal-document-page";
import { ConsentPreferencesPanel } from "@/components/legal/consent-preferences-panel";
import { getLegalDocument } from "@/lib/legal-documents";

const document = getLegalDocument("data-rights");

export const metadata = {
  title: `${document.title} | FitSplit`,
  description: document.description
};

export default function DataRightsPage() {
  return (
    <LegalDocumentPage documentKey="data-rights">
      <ConsentPreferencesPanel />
    </LegalDocumentPage>
  );
}
