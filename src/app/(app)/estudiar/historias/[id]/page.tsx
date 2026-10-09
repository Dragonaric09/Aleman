import type { Metadata } from "next";
import { StoryReader } from "@/components/reading/story-reader";
import { requireUser } from "@/modules/auth";
import { getStory } from "@/modules/reading";
import { getSettings } from "@/modules/settings";

export const metadata: Metadata = { title: "Historia" };

export default async function StoryPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const [story, settings] = await Promise.all([getStory(user.id, id), getSettings(user.id)]);
  return (
    <StoryReader
      key={story.id}
      story={story}
      tts={{ enabled: settings.ttsEnabled, rate: settings.ttsRate, voice: settings.ttsVoice }}
    />
  );
}
