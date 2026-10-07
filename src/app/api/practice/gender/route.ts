import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/modules/auth";
import { genderPractice } from "@/modules/study";
import { handleRouteError } from "@/server/http";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await requireApiUser();
    const limit = z.coerce.number().int().min(1).max(50).default(20).parse(req.nextUrl.searchParams.get("limit") ?? undefined);
    return NextResponse.json({ items: await genderPractice(user.id, limit) });
  } catch (err) {
    return handleRouteError(err);
  }
}
