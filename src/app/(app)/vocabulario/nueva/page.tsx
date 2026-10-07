import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/card";
import { WordForm } from "@/components/word/word-form";
import { requireUser } from "@/modules/auth";
import { listLessons } from "@/modules/vocabulary";
import { createWordAction } from "../actions";

export const metadata: Metadata = { title: "Nueva palabra" };

export default async function NewWordPage() {
  await requireUser();
  const lessons = await listLessons();
  return (
    <>
      <PageHeader
        eyebrow="Vocabulario"
        title="Nueva palabra"
        description="Los campos obligatorios cambian según el tipo de palabra."
      />
      <WordForm action={createWordAction} lessons={lessons} submitLabel="Crear palabra" />
    </>
  );
}
