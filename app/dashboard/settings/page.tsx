import EmailReportSettings from "@/components/settings/EmailReportSettings";

export default function SettingsPage() {
  return (
    <main className="max-w-5xl mx-auto px-4 py-8 flex flex-col gap-6">
      <h1 className="text-lg font-semibold">Impostazioni</h1>
      <EmailReportSettings />
    </main>
  );
}
