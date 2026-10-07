import { NextResponse, type NextRequest } from "next/server";
import { requireApiUser } from "@/modules/auth";
import { MAX_JSON_BYTES, RESTORE_CONFIRMATION, inspectBackup, restoreBackup } from "@/modules/transfer";
import { AppError, handleRouteError } from "@/server/http";

/**
 * Restaura una copia JSON (≤ 20 MB). Sin confirm devuelve solo el resumen;
 * con confirm = "RESTAURAR" reemplaza los datos del usuario en una transacción.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireApiUser();
    const form = await req.formData().catch(() => {
      throw new AppError(400, "VALIDATION", "Envía el archivo como multipart/form-data");
    });
    const file = form.get("file");
    if (!(file instanceof File)) throw new AppError(400, "VALIDATION", "Falta el archivo JSON");
    if (file.size > MAX_JSON_BYTES) throw new AppError(422, "TOO_LARGE", "La copia no puede superar 20 MB");
    if (!file.name.toLowerCase().endsWith(".json") || !["application/json", ""].includes(file.type)) {
      throw new AppError(422, "BAD_TYPE", "El archivo debe ser una copia .json");
    }
    let json: unknown;
    try {
      json = JSON.parse(await file.text());
    } catch {
      throw new AppError(400, "INVALID_BACKUP", "El archivo no es un JSON válido");
    }
    const confirm = form.get("confirm");
    if (confirm !== RESTORE_CONFIRMATION) {
      return NextResponse.json({ restored: false, summary: inspectBackup(json).summary });
    }
    return NextResponse.json({ restored: true, summary: await restoreBackup(user.id, json) });
  } catch (err) {
    return handleRouteError(err);
  }
}
