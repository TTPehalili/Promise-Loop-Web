import { LegalPage } from "@/components/marketing/LegalPage";
import { termsMetadata } from "@/content/site";

export const metadata = termsMetadata;

export default function TermsPage() {
  return <LegalPage doc="terms" title="Terms of Service" />;
}
