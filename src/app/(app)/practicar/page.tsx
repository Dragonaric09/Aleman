import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/card";
import { PracticeHub } from "@/components/study/practice";
import { requireUser } from "@/modules/auth";
import { getSettings } from "@/modules/settings";
import { lessonsWithCounts } from "@/modules/study";

export const metadata: Metadata = { title: "Practicar" };

export default async function PracticePage() {
  const user = await requireUser();
  const [lessons, settings] = await Promise.all([lessonsWithCounts(user.id), getSettings(user.id)]);
  return (
    <>
      <PageHeader
        eyebrow="Práctica libre"
        title="Practicar"
        description="Practica sin afectar tu programación: nada de lo que hagas aquí cambia tus tarjetas."
      />
      <PracticeHub lessons={lessons} tts={{ enabled: settings.ttsEnabled, rate: settings.ttsRate, voice: settings.ttsVoice }} />
    </>
  );
}
