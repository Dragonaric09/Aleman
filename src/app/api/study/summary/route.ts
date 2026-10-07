import { NextResponse } from "next/server";
import { requireApiUser } from "@/modules/auth";
import { getSummary } from "@/modules/study";
import { clock } from "@/server/clock";
import { handleRouteError } from "@/server/http";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireApiUser();
    return NextResponse.json(await getSummary(user.id, clock.now()));
  } catch (err) {
    return handleRouteError(err);
  }
}
