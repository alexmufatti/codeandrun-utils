import dynamic from "next/dynamic";

const WeightDashboard = dynamic(() => import("./WeightDashboard"), {
  ssr: false,
  loading: () => (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        Caricamento...
      </div>
    </main>
  ),
});

export default function Page() {
  return <WeightDashboard />;
}
