import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/modules/auth";
import { lessonPractice } from "@/modules/study";
import { handleRouteError } from "@/server/http";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ number: string }> }) {
  try {
    const user = await requireApiUser();
    const n = z.coerce
      .number()
      .int()
      .positive()
      .parse((await params).number);
    return NextResponse.json(await lessonPractice(user.id, n));
  } catch (err) {
    return handleRouteError(err);
  }
}
