import { NextResponse, type NextRequest } from "next/server";
import { requireApiUser } from "@/modules/auth";
import { getStats } from "@/modules/stats";
import { clock } from "@/server/clock";
import { handleRouteError } from "@/server/http";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await requireApiUser();
    return NextResponse.json(
      await getStats(user.id, req.nextUrl.searchParams.get("range") ?? undefined, clock.now()),
    );
  } catch (err) {
    return handleRouteError(err);
  }
}
