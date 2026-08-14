import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isWordPressUser } from "@/lib/wordpress-auth";
import { listImages, resizeAndUploadImage, deleteFromS3 } from "@/lib/s3";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isWordPressUser(session.user.email)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const images = await listImages();
  return NextResponse.json({ images });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isWordPressUser(session.user.email)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const folder = new Date().toISOString().substring(0, 7).replace("-", "/");
  const { key, url } = await resizeAndUploadImage(file, folder);

  return NextResponse.json({ key, url });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isWordPressUser(session.user.email)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const key = req.nextUrl.searchParams.get("key");
  if (!key || !key.startsWith("uploads/")) {
    return NextResponse.json({ error: "Invalid key" }, { status: 400 });
  }

  await deleteFromS3(key);

  return NextResponse.json({ ok: true });
}
