"use client";

import PaceCalculator from "@/components/pace/PaceCalculator";
import RaceSegments from "@/components/pace/RaceSegments";

export default function PacePage() {
  return (
    <main className="max-w-5xl mx-auto px-4 py-8 flex flex-col gap-6">
      <PaceCalculator />
      <RaceSegments />
    </main>
  );
}
