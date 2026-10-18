import PrivacyContent from "./PrivacyContent";

// Rendered per request so the controller details come from the runtime env.
export const dynamic = "force-dynamic";

export default function PrivacyPage() {
  return (
    <PrivacyContent
      controller={process.env.PRIVACY_CONTROLLER_NAME ?? "[TITOLARE DA DEFINIRE]"}
      email={process.env.PRIVACY_CONTACT_EMAIL ?? "[EMAIL DA DEFINIRE]"}
    />
  );
}
