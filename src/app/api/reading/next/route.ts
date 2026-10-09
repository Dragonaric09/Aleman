import { NextResponse } from "next/server";
import { requireApiUser } from "@/modules/auth";
import { nextStory } from "@/modules/reading";
import { handleRouteError } from "@/server/http";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireApiUser();
    return NextResponse.json({ story: await nextStory(user.id) });
  } catch (err) {
    return handleRouteError(err);
  }
}
