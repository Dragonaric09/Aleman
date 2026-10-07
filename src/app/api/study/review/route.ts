import { NextResponse, type NextRequest } from "next/server";
import { requireApiUser } from "@/modules/auth";
import { submitReview } from "@/modules/study";
import { clock } from "@/server/clock";
import { handleRouteError } from "@/server/http";

export async function POST(req: NextRequest) {
  try {
    const user = await requireApiUser();
    const body: unknown = await req.json().catch(() => null);
    return NextResponse.json(await submitReview(user.id, body, clock.now()));
  } catch (err) {
    return handleRouteError(err);
  }
}
