import { AlertTriangle, ArrowLeft, Info, Star } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WordDisplay } from "@/components/word/gender";
import { WordForm } from "@/components/word/word-form";
import { NoteEditor, SpeakButton, WordActions } from "@/components/word/word-tools";
import { requireUser } from "@/modules/auth";
import { getSettings } from "@/modules/settings";
import { getWordDetail, listLessons, wordToInput } from "@/modules/vocabulary";
import {
  CARD_KIND_LABELS,
  CARD_STATE_LABELS,
  RATING_LABELS,
  WORD_TYPE_LABELS,
  citationForm,
} from "@/modules/vocabulary/shared";
import { updateWordAction } from "../actions";

export const metadata: Metadata = { title: "Ficha" };

const dateFmt = new Intl.DateTimeFormat("es", { day: "numeric", month: "short", year: "numeric" });

export default async function WordDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ copia?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const { copia } = await searchParams;
  const [{ word, cards, note, logs, isOwn }, settings, lessons] = await Promise.all([
    getWordDetail(user.id, id),
    getSettings(user.id),
    listLessons(),
  ]);
  const suspended = cards.length > 0 && cards.every((c) => c.suspended);
  const isLeech = cards.some((c) => c.isLeech);
  const ratingTone = { AGAIN: "bad", HARD: "almost", GOOD: "ok", EASY: "accent" } as const;

  return (
    <div className="grid gap-6">
      <Link
        href="/vocabulario"
        className="text-ink-2 hover:text-ink inline-flex w-fit items-center gap-1.5 text-sm"
      >
        <ArrowLeft className="size-4" aria-hidden /> Vocabulario
      </Link>

      {copia && (
        <p className="border-accent/30 bg-accent-soft flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
          <Info className="text-accent size-4" aria-hidden /> Copia propia creada. La palabra global queda
          suspendida para no estudiarla dos veces.
        </p>
      )}

      <Card raised className="p-6 sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="grid gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge>{WORD_TYPE_LABELS[word.type]}</Badge>
              <Badge>Nivel {word.level}</Badge>
              {word.lesson && <Badge>Lección {word.lesson.number}</Badge>}
              {word.starred && (
                <Badge tone="accent">
                  <Star className="size-3 fill-current" aria-hidden /> prioritaria
                </Badge>
              )}
              <Badge tone={isOwn ? "accent" : "neutral"}>{isOwn ? "propia" : "catálogo global"}</Badge>
              {suspended && <Badge>suspendida</Badge>}
              {isLeech && <Badge tone="bad">rebelde</Badge>}
            </div>
            <WordDisplay word={word} size="xl" />
            <p className="text-ink-2 text-lg">{word.translationEs}</p>
            <dl lang="de" className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
              {word.type === "NOUN" && (
                <div className="flex gap-1.5">
                  <dt className="text-ink-2">Plural</dt>
                  <dd className="text-plural-text">
                    {word.noPlural ? "sin plural" : `die ${word.pluralForm}`}
                  </dd>
                </div>
              )}
              {word.thirdPerson && (
                <div className="flex gap-1.5">
                  <dt className="text-ink-2">er/sie/es</dt>
                  <dd>{word.thirdPerson}</dd>
                </div>
              )}
              {word.perfekt && (
                <div className="flex gap-1.5">
                  <dt className="text-ink-2">Perfekt</dt>
                  <dd>{word.perfekt}</dd>
                </div>
              )}
              {word.governsCase && (
                <div className="flex gap-1.5">
                  <dt className="text-ink-2">Rige</dt>
                  <dd>{word.governsCase}</dd>
                </div>
              )}
            </dl>
          </div>
          <div className="flex flex-col items-start gap-3 sm:items-end">
            <SpeakButton text={citationForm(word)} rate={settings.ttsRate} voice={settings.ttsVoice} />
            <WordActions wordId={word.id} isOwn={isOwn} suspended={suspended} />
          </div>
        </div>

        {(word.exampleDe || word.exampleEs) && (
          <blockquote className="border-accent/60 mt-6 border-l-2 pl-4">
            {word.exampleDe && (
              <p lang="de" className="font-serif text-xl italic">
                {word.exampleDe}
              </p>
            )}
            {word.exampleEs && <p className="text-ink-2">{word.exampleEs}</p>}
          </blockquote>
        )}
        {word.isFalseFriend && word.falseFriendNote && (
          <p className="border-almost/30 bg-almost-bg text-almost mt-4 flex gap-2 rounded-md border px-3 py-2 text-sm">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>
              <strong>Falso amigo:</strong> {word.falseFriendNote}
            </span>
          </p>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Notas</CardTitle>
          </CardHeader>
          <CardContent>
            <NoteEditor
              wordId={word.id}
              mnemonic={note?.mnemonic ?? null}
              ownSentence={note?.ownSentence ?? null}
              highlightMnemonic={isLeech}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tarjetas</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-line divide-y text-sm">
              {cards.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <span className="font-medium">{CARD_KIND_LABELS[c.kind]}</span>
                  <span className="text-ink-2 flex flex-wrap items-center gap-1.5">
                    <Badge tone={c.state === "REVIEW" ? "ok" : c.state === "NEW" ? "neutral" : "almost"}>
                      {CARD_STATE_LABELS[c.state]}
                    </Badge>
                    {c.state !== "NEW" && <span className="tabular">próx. {dateFmt.format(c.due)}</span>}
                    {c.lapses > 0 && <span className="tabular">· {c.lapses} lapsos</span>}
                    {c.suspended && <Badge>suspendida</Badge>}
                    {c.isLeech && <Badge tone="bad">rebelde</Badge>}
                  </span>
                </li>
              ))}
            </ul>
            <h3 className="mt-6 mb-2 text-sm font-medium">Historial de repasos</h3>
            {logs.length === 0 ? (
              <p className="text-ink-2 text-sm">Todavía no hay repasos.</p>
            ) : (
              <ul className="grid gap-1.5 text-sm">
                {logs.map((l) => (
                  <li key={l.id} className="flex items-center justify-between gap-2">
                    <span className="tabular text-ink-2">{dateFmt.format(l.reviewedAt)}</span>
                    <span className="text-ink-2 truncate text-xs">{CARD_KIND_LABELS[l.card.kind]}</span>
                    <Badge tone={ratingTone[l.rating]}>{RATING_LABELS[l.rating]}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {isOwn && (
        <section aria-labelledby="edit-title">
          <h2 id="edit-title" className="mb-4 font-serif text-2xl font-semibold">
            Editar
          </h2>
          <WordForm
            action={updateWordAction.bind(null, word.id)}
            initial={wordToInput(word)}
            lessons={lessons}
            submitLabel="Guardar cambios"
          />
        </section>
      )}
    </div>
  );
}
