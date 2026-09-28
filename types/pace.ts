export type CalcMode = "pace" | "time" | "distance";
export type SplitUnit = "km" | "mi";

export interface Split {
  label: string;
  splitTime: string;
  cumulative: string;
  distance: number;
  isPartial?: boolean;
}

export interface Segment {
  id: string;
  label: string;
  distanceKm: string;
  paceInput: string;
  isRest?: boolean;
}

export interface SegmentBreakpoint {
  startKm: number;
  endKm: number;
  startSec: number;
  paceSec: number;
}
