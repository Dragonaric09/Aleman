import { type NextRequest } from "next/server";
import { requireApiUser } from "@/modules/auth";
import { buildBackup, exportAnkiCsv, exportFormatSchema, exportVocabularyCsv } from "@/modules/transfer";
import { clock } from "@/server/clock";
import { handleRouteError } from "@/server/http";

export const dynamic = "force-dynamic";

function download(body: string, filename: string, type: string) {
  return new Response(body, {
    headers: {
      "Content-Type": `${type}; charset=utf-8`,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireApiUser();
    const format = exportFormatSchema.parse(req.nextUrl.searchParams.get("format") ?? "csv");
    const now = clock.now();
    const stamp = now.toISOString().slice(0, 10);
    if (format === "csv") {
      const includeGlobal = req.nextUrl.searchParams.get("includeGlobal") === "1";
      return download(await exportVocabularyCsv(user.id, includeGlobal), `wortschatz_${stamp}.csv`, "text/csv");
    }
    if (format === "anki") return download(await exportAnkiCsv(user.id), `wortschatz_anki_${stamp}.csv`, "text/csv");
    const backup = await buildBackup(user.id, now);
    return download(JSON.stringify(backup), `wortschatz_copia_${stamp}.json`, "application/json");
  } catch (err) {
    return handleRouteError(err);
  }
}
