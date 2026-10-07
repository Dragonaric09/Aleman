"use client";

import { AlertTriangle, Download, FileJson, FileSpreadsheet, Upload } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FormMessage, Input, Label } from "@/components/ui/form";

interface ImportReport {
  created: number;
  updated: number;
  valid: number;
  dryRun: boolean;
  errors: { row: number; field: string; message: string }[];
  preview: { row: number; lemma: string; type: string; translationEs: string; action: "create" | "update" }[];
}

interface BackupSummary {
  exportedAt: string;
  ownWords: number;
  cards: number;
  reviewLogs: number;
  notes: number;
}

async function postForm<T>(url: string, form: FormData): Promise<T> {
  const res = await fetch(url, { method: "POST", body: form });
  const body = (await res.json().catch(() => ({}))) as T & { error?: { message: string } };
  if (!res.ok) throw new Error(body.error?.message ?? "Error al subir el archivo");
  return body;
}

export function ImportCard() {
  const [file, setFile] = useState<File | null>(null);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  async function send(dryRun: boolean) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("dryRun", String(dryRun));
      const r = await postForm<ImportReport>("/api/transfer/import", form);
      if (dryRun) setReport(r);
      else {
        setReport(null);
        setFile(null);
        setDone(`Importación completada: ${r.created} palabras creadas y ${r.updated} actualizadas.`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="size-5 text-accent" aria-hidden /> Importar CSV
        </CardTitle>
        <CardDescription>
          Formato de la sección 9.1 (UTF-8, separador «;»). Se añade a tus palabras propias. Verás la vista previa y los errores antes de guardar.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <Field label="Archivo CSV (máx. 2 MB)" htmlFor="csv">
          <Input
            id="csv"
            type="file"
            accept=".csv,text/csv"
            className="h-auto py-2 file:mr-3 file:rounded-sm file:border-0 file:bg-surface-2 file:px-2 file:py-1 file:text-sm"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setReport(null);
              setDone(null);
            }}
          />
        </Field>
        <div>
          <Button variant="secondary" onClick={() => send(true)} disabled={!file} loading={busy && !report}>
            Ver vista previa
          </Button>
        </div>
        {error && <FormMessage tone="error">{error}</FormMessage>}
        {done && <FormMessage tone="ok">{done}</FormMessage>}
        {report && (
          <div className="grid gap-4">
            <p className="text-sm">
              <strong>{report.valid}</strong> filas válidas ({report.created} nuevas, {report.updated} actualizaciones) ·{" "}
              <strong className={report.errors.length ? "text-bad" : ""}>{report.errors.length}</strong> errores
            </p>
            {report.errors.length > 0 && (
              <div className="max-h-56 overflow-auto rounded-md border border-bad/30">
                <table className="w-full text-left text-xs">
                  <caption className="sr-only">Errores por fila</caption>
                  <thead className="sticky top-0 bg-bad-bg text-bad">
                    <tr>
                      <th scope="col" className="px-3 py-1.5">Fila</th>
                      <th scope="col" className="px-3 py-1.5">Campo</th>
                      <th scope="col" className="px-3 py-1.5">Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.errors.map((e, i) => (
                      <tr key={i} className="border-t border-line">
                        <td className="tabular px-3 py-1">{e.row}</td>
                        <td className="px-3 py-1 font-mono">{e.field}</td>
                        <td className="px-3 py-1">{e.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {report.preview.length > 0 && (
              <div className="max-h-56 overflow-auto rounded-md border border-line">
                <table className="w-full text-left text-xs">
                  <caption className="sr-only">Vista previa</caption>
                  <thead className="sticky top-0 bg-surface-2">
                    <tr>
                      <th scope="col" className="px-3 py-1.5">Fila</th>
                      <th scope="col" className="px-3 py-1.5">Lema</th>
                      <th scope="col" className="px-3 py-1.5">Traducción</th>
                      <th scope="col" className="px-3 py-1.5">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.preview.map((p) => (
                      <tr key={p.row} className="border-t border-line">
                        <td className="tabular px-3 py-1">{p.row}</td>
                        <td lang="de" className="px-3 py-1 font-serif">{p.lemma}</td>
                        <td className="px-3 py-1">{p.translationEs}</td>
                        <td className="px-3 py-1">{p.action === "create" ? "crear" : "actualizar"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div>
              <Button onClick={() => send(false)} disabled={report.valid === 0} loading={busy}>
                Importar {report.valid} filas válidas
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ExportCard() {
  const [includeGlobal, setIncludeGlobal] = useState(false);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="size-5 text-accent" aria-hidden /> Exportar
        </CardTitle>
        <CardDescription>Descarga tus datos en el formato que necesites.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2 rounded-md border border-line p-3">
          <p className="flex items-center gap-2 text-sm font-medium">
            <FileSpreadsheet className="size-4" aria-hidden /> CSV de vocabulario
          </p>
          <label className="flex items-center gap-2 text-sm text-ink-2">
            <input type="checkbox" checked={includeGlobal} onChange={(e) => setIncludeGlobal(e.target.checked)} className="size-4 accent-[var(--accent)]" />
            Incluir también el catálogo global
          </label>
          <Button asChild variant="secondary" size="sm" className="w-fit">
            <a href={`/api/transfer/export?format=csv${includeGlobal ? "&includeGlobal=1" : ""}`} download>
              Descargar CSV
            </a>
          </Button>
        </div>
        <div className="grid gap-2 rounded-md border border-line p-3">
          <p className="flex items-center gap-2 text-sm font-medium">
            <FileSpreadsheet className="size-4" aria-hidden /> CSV para Anki
          </p>
          <p className="text-xs text-ink-2">Front = español; Back = alemán con artículo coloreado, plural y ejemplo.</p>
          <Button asChild variant="secondary" size="sm" className="w-fit">
            <a href="/api/transfer/export?format=anki" download>
              Descargar para Anki
            </a>
          </Button>
        </div>
        <div className="grid gap-2 rounded-md border border-line p-3">
          <p className="flex items-center gap-2 text-sm font-medium">
            <FileJson className="size-4" aria-hidden /> Copia de seguridad JSON
          </p>
          <p className="text-xs text-ink-2">Ajustes, palabras propias, tarjetas, historial y notas.</p>
          <Button asChild variant="secondary" size="sm" className="w-fit">
            <a href="/api/transfer/export?format=json" download>
              Descargar copia
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function RestoreCard() {
  const [file, setFile] = useState<File | null>(null);
  const [summary, setSummary] = useState<BackupSummary | null>(null);
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function send(withConfirm: boolean) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("file", file);
      if (withConfirm) form.set("confirm", confirm);
      const r = await postForm<{ restored: boolean; summary: BackupSummary }>("/api/transfer/restore", form);
      setSummary(r.summary);
      if (r.restored) {
        setDone(true);
        setConfirm("");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="border-bad/25">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="size-5 text-bad" aria-hidden /> Restaurar copia
        </CardTitle>
        <CardDescription>Reemplaza todos tus datos actuales por los de la copia. No se puede deshacer.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <Field label="Copia JSON (máx. 20 MB)" htmlFor="backup">
          <Input
            id="backup"
            type="file"
            accept=".json,application/json"
            className="h-auto py-2 file:mr-3 file:rounded-sm file:border-0 file:bg-surface-2 file:px-2 file:py-1 file:text-sm"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setSummary(null);
              setDone(false);
            }}
          />
        </Field>
        {!summary && (
          <div>
            <Button variant="secondary" onClick={() => send(false)} disabled={!file} loading={busy}>
              Revisar copia
            </Button>
          </div>
        )}
        {error && <FormMessage tone="error">{error}</FormMessage>}
        {done && <FormMessage tone="ok">Copia restaurada correctamente.</FormMessage>}
        {summary && !done && (
          <div className="grid gap-3">
            <p className="text-sm">
              Copia del {new Date(summary.exportedAt).toLocaleString("es")}: {summary.ownWords} palabras propias, {summary.cards} tarjetas,{" "}
              {summary.reviewLogs} repasos y {summary.notes} notas.
            </p>
            <div className="grid gap-1.5">
              <Label htmlFor="confirm-restore">
                Escribe <span className="font-mono">RESTAURAR</span> para confirmar
              </Label>
              <Input id="confirm-restore" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" />
            </div>
            <div>
              <Button variant="danger" onClick={() => send(true)} disabled={confirm !== "RESTAURAR"} loading={busy}>
                Restaurar y reemplazar mis datos
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
