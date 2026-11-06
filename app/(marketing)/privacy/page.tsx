import { LegalPage } from "@/components/marketing/LegalPage";
import { privacyMetadata } from "@/content/site";

export const metadata = privacyMetadata;

export default function PrivacyPage() {
  return <LegalPage doc="privacy" title="Privacy Policy" />;
}
