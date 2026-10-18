import HrvEntry from "@/models/HrvEntry";
import RestHrEntry from "@/models/RestHrEntry";
import SleepEntry from "@/models/SleepEntry";

// HRV, resting HR and sleep come only from the garmin-sync sidecar, which
// serves a single account. Everyone else has no such data, ever — used to
// hide those sections instead of showing permanent "no data" placeholders.
// Callers must have an open Mongoose connection.
export async function hasGarminData(userId: string): Promise<boolean> {
  const found = await Promise.all([
    HrvEntry.exists({ userId }),
    RestHrEntry.exists({ userId }),
    SleepEntry.exists({ userId }),
  ]);
  return found.some(Boolean);
}
