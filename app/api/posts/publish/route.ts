import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isWordPressUser } from "@/lib/wordpress-auth";
import { buildMdx, buildFilename, slugify, type PostFields } from "@/lib/posts/buildMdx";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isWordPressUser(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const {
    title,
    date,
    slug: slugOverride,
    body: mdxBody,
    filename: rawFilename,
    content: rawContent,
  } = body as Partial<PostFields> & { slug?: string; filename?: string; content?: string };

  let filename: string;
  let content: string;

  if (rawFilename && rawContent) {
    // MDX già pronto (es. bozza generata dalle attività Strava): pubblica così com'è.
    filename = rawFilename;
    content = rawContent;
  } else {
    if (!title || !date || !mdxBody) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const slug = slugify(slugOverride || title);
    if (!slug) {
      return NextResponse.json({ error: "Could not derive a slug from the title" }, { status: 400 });
    }

    filename = buildFilename(date, slug);
    content = buildMdx({
      title,
      date,
      excerpt: body.excerpt,
      seoDescription: body.seoDescription,
      categories: body.categories,
      tags: body.tags,
      featuredImage: body.featuredImage,
      featuredImageAlt: body.featuredImageAlt,
      places: body.places,
      body: mdxBody,
    });
  }

  const deployUrl = process.env.DEPLOY_SERVICE_URL;
  const deploySecret = process.env.DEPLOY_SERVICE_SECRET;
  if (!deployUrl || !deploySecret) {
    return NextResponse.json({ error: "Deploy service not configured" }, { status: 500 });
  }

  let deployRes: Response;
  try {
    deployRes = await fetch(`${deployUrl}/publish`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-deploy-secret": deploySecret,
      },
      body: JSON.stringify({
        filename,
        content,
        commitMessage: `Add post: ${filename}`,
      }),
    });
  } catch (err) {
    return NextResponse.json({ error: "Deploy service unreachable", detail: String(err) }, { status: 502 });
  }

  const data = await deployRes.json();
  return NextResponse.json(data, { status: deployRes.status });
}
