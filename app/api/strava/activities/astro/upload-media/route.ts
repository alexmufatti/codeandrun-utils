import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isWordPressUser } from "@/lib/wordpress-auth";
import { resizeAndUploadImage } from "@/lib/s3";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isWordPressUser(session.user.email)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const folder = (form.get("folder") as string | null) ?? new Date().toISOString().substring(0, 7).replace("-", "/");

  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const { key } = await resizeAndUploadImage(file, folder);

  return NextResponse.json({ path: `/${key}` });
}
