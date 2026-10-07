import { Flame } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui/card";
import { WordDisplay } from "@/components/word/gender";
import { NoteEditor, ResetCardButton } from "@/components/word/word-tools";
import { requireUser } from "@/modules/auth";
import { listLeeches } from "@/modules/vocabulary";
import { CARD_KIND_LABELS } from "@/modules/vocabulary/shared";

export const metadata: Metadata = { title: "Rebeldes" };

export default async function LeechesPage() {
  const user = await requireUser();
  const leeches = await listLeeches(user.id);
  return (
    <>
      <PageHeader
        eyebrow="Wortschatz"
        title="Palabras rebeldes"
        description="Tarjetas que has olvidado muchas veces. Un buen truco (mnemotecnia) suele bastar para domarlas."
      />
      {leeches.length === 0 ? (
        <EmptyState icon={<Flame />} title="Ninguna rebelde por ahora">
          Cuando una tarjeta acumule muchos olvidos aparecerá aquí con espacio para tu truco.
        </EmptyState>
      ) : (
        <div className="grid gap-4">
          {leeches.map((c) => (
            <Card key={c.id} className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
              <div className="grid content-start gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="bad">
                    <Flame className="size-3" aria-hidden /> {c.lapses} lapsos
                  </Badge>
                  <Badge>{CARD_KIND_LABELS[c.kind]}</Badge>
                  {c.suspended && <Badge>suspendida</Badge>}
                </div>
                <Link href={`/vocabulario/${c.word.id}`} className="w-fit hover:opacity-80">
                  <WordDisplay word={c.word} size="lg" />
                </Link>
                <p className="text-ink-2">{c.word.translationEs}</p>
                <div className="mt-2">
                  <ResetCardButton cardId={c.id} />
                </div>
              </div>
              <NoteEditor
                wordId={c.word.id}
                mnemonic={c.word.notes[0]?.mnemonic ?? null}
                ownSentence={c.word.notes[0]?.ownSentence ?? null}
                highlightMnemonic
              />
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
