import { notFound } from "next/navigation";
import connectDB from "@/lib/mongodb";
import MealShare from "@/models/MealShare";
import MealPlannerGrid from "@/components/meals/MealPlannerGrid";

export default async function SharedMealsPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!/^[0-9a-f]{48}$/.test(token)) notFound();

  await connectDB();
  const share = await MealShare.findOne({ token }).lean();
  if (!share) notFound();

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold">Menu Settimanale</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {share.canWrite
            ? "Puoi visualizzare e modificare"
            : "Sola lettura"}
        </p>
      </div>
      <MealPlannerGrid
        apiBase={`/api/meals/shared/${token}`}
        readOnly={!share.canWrite}
      />
    </main>
  );
}
