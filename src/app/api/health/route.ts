import { NextResponse } from "next/server";
import { checkDatabase } from "@/server/health";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = await checkDatabase();
  return NextResponse.json(
    { status: db ? "ok" : "error", db: db ? "ok" : "error" },
    { status: db ? 200 : 503 },
  );
}
