import { NextResponse, type NextRequest } from "next/server";
import { requireApiUser } from "@/modules/auth";
import { MAX_CSV_BYTES, importVocabularyCsv } from "@/modules/transfer";
import { AppError, handleRouteError } from "@/server/http";

const CSV_TYPES = ["text/csv", "text/plain", "application/vnd.ms-excel", ""];

/** Sube un CSV (≤ 2 MB). Con dryRun=true solo devuelve la vista previa. Se procesa en memoria. */
export async function POST(req: NextRequest) {
  try {
    const user = await requireApiUser();
    const form = await req.formData().catch(() => {
      throw new AppError(400, "VALIDATION", "Envía el archivo como multipart/form-data");
    });
    const file = form.get("file");
    if (!(file instanceof File)) throw new AppError(400, "VALIDATION", "Falta el archivo CSV");
    if (file.size > MAX_CSV_BYTES) throw new AppError(422, "TOO_LARGE", "El CSV no puede superar 2 MB");
    if (!file.name.toLowerCase().endsWith(".csv") || !CSV_TYPES.includes(file.type)) {
      throw new AppError(422, "BAD_TYPE", "El archivo debe ser un CSV");
    }
    const dryRun = form.get("dryRun") !== "false";
    const report = await importVocabularyCsv(user.id, await file.text(), dryRun);
    return NextResponse.json({ ...report, dryRun });
  } catch (err) {
    return handleRouteError(err);
  }
}
