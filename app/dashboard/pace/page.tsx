"use client";

import { useLocalStorage } from "@/lib/hooks/useLocalStorage";
import PaceCalculator from "@/components/pace/PaceCalculator";
import PassageTimes from "@/components/pace/PassageTimes";
import RaceSegments, { makeSegment } from "@/components/pace/RaceSegments";
import type { Segment } from "@/types/pace";

export default function PacePage() {
  const [totalRaceKm, setTotalRaceKm] = useLocalStorage("pace-segments-total-km", "");
  const [segments, setSegments] = useLocalStorage<Segment[]>("pace-segments-list", [
    makeSegment(),
    makeSegment(),
  ]);

  return (
    <main className="max-w-5xl mx-auto px-4 py-8 flex flex-col gap-6">
      <PaceCalculator />
      <RaceSegments
        totalRaceKm={totalRaceKm}
        setTotalRaceKm={setTotalRaceKm}
        segments={segments}
        setSegments={setSegments}
      />
      <PassageTimes segments={segments} totalRaceKm={totalRaceKm} />
    </main>
  );
}
