export interface RepTime {
  distance: string;
  time: string;
}

export interface TrainingZone {
  id: "E" | "M" | "T" | "I" | "R";
  paceSecPerKm: number;
  paceRangeMinSec?: number; // faster end (lower sec/km)
  paceRangeMaxSec?: number; // slower end (higher sec/km)
  repTimes?: RepTime[];
}

export interface RacePrediction {
  label: string;
  distanceM: number;
  timeStr: string;
}
