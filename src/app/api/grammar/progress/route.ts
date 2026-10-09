import { NextResponse } from "next/server";
import { requireApiUser } from "@/modules/auth";
import { listTopics } from "@/modules/grammar";
import { handleRouteError } from "@/server/http";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireApiUser();
    return NextResponse.json({ topics: await listTopics(user.id) });
  } catch (err) {
    return handleRouteError(err);
  }
}
