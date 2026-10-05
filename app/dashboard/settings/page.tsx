import EmailReportSettings from "@/components/settings/EmailReportSettings";
import StravaConnection from "@/components/settings/StravaConnection";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className="max-w-5xl mx-auto px-4 py-8 flex flex-col gap-6">
      <h1 className="text-lg font-semibold">Impostazioni</h1>
      <StravaConnection error={error ?? null} />
      <EmailReportSettings />
    </main>
  );
}
