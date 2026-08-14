import HrvPageClient from "./HrvPageClient";

export default function HrvPage() {
  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-xl font-bold mb-6">HRV & Frequenza Cardiaca a riposo</h1>
      <HrvPageClient />
    </main>
  );
}
