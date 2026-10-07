"use client";

import { Copy, EyeOff, Lightbulb, PenLine, RotateCcw, Trash2, Undo2, Volume2 } from "lucide-react";
import { useState, useTransition } from "react";
import {
  copyWordAction,
  deleteWordAction,
  resetCardAction,
  saveNoteAction,
  setWordSuspendedAction,
} from "@/app/(app)/vocabulario/actions";
import { Button } from "@/components/ui/button";
import { FormMessage, Label, Textarea } from "@/components/ui/form";
import { useSpeech } from "../study/use-speech";

export function SpeakButton({
  text,
  rate = 0.9,
  voice = null,
}: {
  text: string;
  rate?: number;
  voice?: string | null;
}) {
  const tts = useSpeech({ enabled: true, rate, voiceName: voice });
  if (!tts.available) return null;
  return (
    <Button type="button" variant="secondary" size="sm" onClick={() => tts.speak(text)}>
      <Volume2 aria-hidden /> Escuchar
    </Button>
  );
}

/** Mnemotecnia y «mi frase». La mnemotecnia se destaca si alguna tarjeta es rebelde. */
export function NoteEditor({
  wordId,
  mnemonic,
  ownSentence,
  highlightMnemonic,
}: {
  wordId: string;
  mnemonic: string | null;
  ownSentence: string | null;
  highlightMnemonic?: boolean;
}) {
  const [m, setM] = useState(mnemonic ?? "");
  const [s, setS] = useState(ownSentence ?? "");
  const [msg, setMsg] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await saveNoteAction(wordId, { mnemonic: m, ownSentence: s });
          setMsg(r.error ? { tone: "error", text: r.error } : { tone: "ok", text: "Nota guardada" });
        });
      }}
    >
      <div
        className={
          highlightMnemonic ? "border-bad/30 bg-bad-bg grid gap-1.5 rounded-md border p-3" : "grid gap-1.5"
        }
      >
        <Label htmlFor={`m-${wordId}`} className="flex items-center gap-1.5">
          <Lightbulb className="text-accent size-4" aria-hidden /> Mnemotecnia
        </Label>
        {highlightMnemonic && (
          <p className="text-bad text-xs">Esta palabra es rebelde: escribe un truco para recordarla.</p>
        )}
        <Textarea
          id={`m-${wordId}`}
          rows={2}
          value={m}
          onChange={(e) => setM(e.target.value)}
          placeholder="Un truco, una imagen, una rima…"
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`s-${wordId}`} className="flex items-center gap-1.5">
          <PenLine className="text-accent size-4" aria-hidden /> Mi frase
        </Label>
        <Textarea
          id={`s-${wordId}`}
          lang="de"
          rows={2}
          value={s}
          onChange={(e) => setS(e.target.value)}
          placeholder="Escribe una frase tuya en alemán"
        />
      </div>
      {msg && <FormMessage tone={msg.tone}>{msg.text}</FormMessage>}
      <div>
        <Button type="submit" size="sm" loading={pending}>
          Guardar nota
        </Button>
      </div>
    </form>
  );
}

export function WordActions({
  wordId,
  isOwn,
  suspended,
}: {
  wordId: string;
  isOwn: boolean;
  suspended: boolean;
}) {
  const [pending, start] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="secondary"
        size="sm"
        loading={pending}
        onClick={() => start(async () => void (await setWordSuspendedAction(wordId, !suspended)))}
      >
        {suspended ? <Undo2 aria-hidden /> : <EyeOff aria-hidden />}
        {suspended ? "Reactivar" : "Suspender"}
      </Button>
      {!isOwn && (
        <form action={copyWordAction.bind(null, wordId)}>
          <Button type="submit" variant="secondary" size="sm">
            <Copy aria-hidden /> Crear copia propia
          </Button>
        </form>
      )}
      {isOwn &&
        (confirmDelete ? (
          <form action={deleteWordAction.bind(null, wordId)} className="flex items-center gap-2">
            <span className="text-bad text-sm">¿Borrar la palabra y su historial?</span>
            <Button type="submit" variant="danger" size="sm">
              Sí, borrar
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
              Cancelar
            </Button>
          </form>
        ) : (
          <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)}>
            <Trash2 aria-hidden /> Borrar
          </Button>
        ))}
    </div>
  );
}

export function ResetCardButton({ cardId }: { cardId: string }) {
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  return (
    <Button
      variant="secondary"
      size="sm"
      loading={pending}
      disabled={done}
      onClick={() =>
        start(async () => {
          const r = await resetCardAction(cardId);
          if (r.ok) setDone(true);
        })
      }
    >
      <RotateCcw aria-hidden /> {done ? "Reiniciada" : "Reiniciar tarjeta"}
    </Button>
  );
}
