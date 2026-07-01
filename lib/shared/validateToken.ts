import connectDB from "@/lib/mongodb";
import MealShare from "@/models/MealShare";

export async function validateSharedToken(
  token: string
): Promise<{ userId: string; canWrite: boolean } | null> {
  if (!/^[0-9a-f]{48}$/.test(token)) return null;
  await connectDB();
  const share = await MealShare.findOne({ token }).lean();
  if (!share) return null;
  return { userId: share.userId as string, canWrite: share.canWrite };
}
