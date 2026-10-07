import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/card";
import { ExportCard, ImportCard, RestoreCard } from "@/components/transfer/transfer-panel";
import { requireUser } from "@/modules/auth";

export const metadata: Metadata = { title: "Importar / exportar" };

export default async function TransferPage() {
  await requireUser();
  return (
    <>
      <PageHeader eyebrow="Tus datos" title="Importar y exportar" description="Los archivos se procesan en memoria y nunca se guardan en el servidor." />
      <div className="grid gap-6 lg:grid-cols-2">
        <ImportCard />
        <div className="grid content-start gap-6">
          <ExportCard />
          <RestoreCard />
        </div>
      </div>
    </>
  );
}
