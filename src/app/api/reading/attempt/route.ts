import { NextResponse, type NextRequest } from "next/server";
import { requireApiUser } from "@/modules/auth";
import { submitAttempt } from "@/modules/reading";
import { clock } from "@/server/clock";
import { handleRouteError } from "@/server/http";

/** Registra un intento de los ejercicios de una historia. No afecta FSRS. */
export async function POST(req: NextRequest) {
  try {
    const user = await requireApiUser();
    const body: unknown = await req.json().catch(() => null);
    return NextResponse.json(await submitAttempt(user.id, body, clock.now()));
  } catch (err) {
    return handleRouteError(err);
  }
}
