import type { Metadata } from "next";
import { StudySession } from "@/components/study/study-session";
import { requireUser } from "@/modules/auth";
import { getSettings } from "@/modules/settings";
import { getQueue } from "@/modules/study";
import { clock } from "@/server/clock";

export const metadata: Metadata = { title: "Estudiar" };

export default async function StudyPage() {
  const user = await requireUser();
  const [settings, items] = await Promise.all([getSettings(user.id), getQueue(user.id, clock.now(), 20)]);
  return (
    <>
      <h1 className="sr-only">Sesión de estudio</h1>
      <StudySession
        initial={items}
        prefs={{
          strictCapitalization: settings.strictCapitalization,
          ttsEnabled: settings.ttsEnabled,
          ttsAutoplay: settings.ttsAutoplay,
          ttsRate: settings.ttsRate,
          ttsVoice: settings.ttsVoice,
        }}
      />
    </>
  );
}
