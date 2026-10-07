import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/modules/auth";
import { getQueue } from "@/modules/study";
import { clock } from "@/server/clock";
import { handleRouteError } from "@/server/http";

export const dynamic = "force-dynamic";

const limitSchema = z.coerce.number().int().min(1).max(50).default(20);

export async function GET(req: NextRequest) {
  try {
    const user = await requireApiUser();
    const limit = limitSchema.parse(req.nextUrl.searchParams.get("limit") ?? undefined);
    return NextResponse.json({ items: await getQueue(user.id, clock.now(), limit) });
  } catch (err) {
    return handleRouteError(err);
  }
}
