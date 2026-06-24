import { auth } from "@/auth";
import { revalidateTag } from "next/cache";
import { CACHE_TAG } from "@/lib/wrikeCache";
import { NextResponse } from "next/server";

export async function POST() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  revalidateTag(CACHE_TAG);
  return NextResponse.json({ ok: true, revalidated: true, tag: CACHE_TAG });
}
