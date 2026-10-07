import { NextResponse } from "next/server";
import { requireApiUser } from "@/modules/auth";
import { undoLastReview } from "@/modules/study";
import { clock } from "@/server/clock";
import { handleRouteError } from "@/server/http";

export async function POST() {
  try {
    const user = await requireApiUser();
    return NextResponse.json(await undoLastReview(user.id, clock.now()));
  } catch (err) {
    return handleRouteError(err);
  }
}
