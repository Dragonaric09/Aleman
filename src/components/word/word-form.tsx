"use client";

import { useActionState, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, FormMessage, Input, Label, Select, Textarea } from "@/components/ui/form";
import type { ActionState } from "@/lib/action-result";
import { buildPrompt, expectedAnswer } from "@/modules/study/shared";
import {
  CARD_KIND_LABELS,
  WORD_TYPES,
  WORD_TYPE_LABELS,
  possibleCardKinds,
  type Gender,
  type WordType,
} from "@/modules/vocabulary/shared";
import { GenderBadge, WordDisplay } from "./gender";

export interface WordFormValues {
  lemma: string;
  type: WordType;
  gender: Gender | null;
  pluralSuffix: string | null;
  pluralForm: string | null;
  noPlural: boolean;
  translationEs: string;
  exampleDe: string | null;
  exampleEs: string | null;
  clozeText: string | null;
  level: "A" | "B" | "C";
  starred: boolean;
  lessonNumber: number | null;
  sources: string[];
  isCognate: boolean;
  isFalseFriend: boolean;
  falseFriendNote: string | null;
  separablePrefix: string | null;
  thirdPerson: string | null;
  perfekt: string | null;
  auxiliary: "HABEN" | "SEIN" | null;
  isIrregular: boolean;
  governsCase: string | null;
  tags: string[];
  goetheLevel?: string | null;
  frequencyRank?: number | null;
}

const EMPTY: WordFormValues = {
  lemma: "",
  type: "NOUN",
  gender: null,
  pluralSuffix: null,
  pluralForm: null,
  noPlural: false,
  translationEs: "",
  exampleDe: null,
  exampleEs: null,
  clozeText: null,
  level: "B",
  starred: false,
  lessonNumber: null,
  sources: [],
  isCognate: false,
  isFalseFriend: false,
  falseFriendNote: null,
  separablePrefix: null,
  thirdPerson: null,
  perfekt: null,
  auxiliary: null,
  isIrregular: false,
  governsCase: null,
  tags: [],
};

/** Formulario dinámico: los campos obligatorios cambian según el tipo de palabra (6.2). */
export function WordForm({
  action,
  initial,
  lessons,
  submitLabel,
}: {
  action: (prev: ActionState, form: FormData) => Promise<ActionState>;
  initial?: Partial<WordFormValues>;
  lessons: { number: number; title: string }[];
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, {});
  const [v, setV] = useState<WordFormValues>({ ...EMPTY, ...initial });
  const set = <K extends keyof WordFormValues>(k: K, value: WordFormValues[K]) => setV((s) => ({ ...s, [k]: value }));
  const fe = state.fieldErrors ?? {};
  const err = (k: string) => fe[k];
  const isNoun = v.type === "NOUN";
  const isVerb = v.type === "VERB";
  const isExpr = v.type === "EXPRESSION";

  const kinds = useMemo(() => possibleCardKinds({ ...v, pluralForm: v.noPlural ? null : v.pluralForm }), [v]);
  const previewWord = { ...v, lemma: v.lemma || "…", translationEs: v.translationEs || "…", isFalseFriend: v.isFalseFriend };
  const firstKind = kinds[0]!;
  const prompt = buildPrompt(firstKind, previewWord);

  const text = (k: keyof WordFormValues) => ({
    id: k,
    name: k,
    value: (v[k] as string | null) ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set(k, e.target.value as never),
    "aria-invalid": !!err(k) || undefined,
    "aria-describedby": err(k) ? `${k}-error` : undefined,
  });

  return (
    <form action={formAction} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]" noValidate>
      <div className="grid gap-6">
        <input type="hidden" name="goetheLevel" value={v.goetheLevel ?? ""} />
        <input type="hidden" name="frequencyRank" value={v.frequencyRank ?? ""} />
        {state.error && <FormMessage tone="error">{state.error}</FormMessage>}
        {state.message && <FormMessage tone="ok">{state.message}</FormMessage>}

        <Card className="grid gap-5 p-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Tipo de palabra" htmlFor="type" error={err("type")}>
              <Select id="type" name="type" value={v.type} onChange={(e) => set("type", e.target.value as WordType)}>
                {WORD_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {WORD_TYPE_LABELS[t]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Lema (alemán)"
              htmlFor="lemma"
              error={err("lemma")}
              hint={isNoun ? "Sin artículo y con mayúscula: Bahnhof" : isVerb ? "Separables con barra: ab|biegen" : isExpr ? "Wie komme ich zum ...?" : undefined}
            >
              <Input {...text("lemma")} lang="de" required autoComplete="off" />
            </Field>
          </div>

          {isNoun && (
            <fieldset className="grid gap-5 rounded-md border border-line p-4">
              <legend className="px-1 text-sm font-medium">Sustantivo</legend>
              <div className="grid gap-1.5">
                <span className="text-sm font-medium" id="gender-label">
                  Género <span className="text-bad">*</span>
                </span>
                <div role="radiogroup" aria-labelledby="gender-label" className="flex flex-wrap gap-2">
                  {(["DER", "DIE", "DAS"] as const).map((g) => (
                    <label
                      key={g}
                      className="flex cursor-pointer items-center gap-2 rounded-md border border-line-strong px-3 py-2 has-[:checked]:border-accent has-[:checked]:ring-2 has-[:checked]:ring-accent/25"
                    >
                      <input type="radio" name="gender" value={g} checked={v.gender === g} onChange={() => set("gender", g)} className="sr-only" />
                      <GenderBadge gender={g} />
                    </label>
                  ))}
                </div>
                {err("gender") && (
                  <p className="text-xs text-bad" role="alert">
                    {err("gender")}
                  </p>
                )}
              </div>
              <div className="grid gap-5 sm:grid-cols-[120px_1fr]">
                <Field label="Sufijo" htmlFor="pluralSuffix" hint="-¨e, -n, -s…">
                  <Input {...text("pluralSuffix")} disabled={v.noPlural} />
                </Field>
                <Field label="Plural" htmlFor="pluralForm" error={err("pluralForm")} hint="Forma completa: Bahnhöfe">
                  <Input {...text("pluralForm")} lang="de" disabled={v.noPlural} />
                </Field>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="noPlural" checked={v.noPlural} onChange={(e) => set("noPlural", e.target.checked)} className="size-4 accent-[var(--accent)]" />
                Sin plural
              </label>
            </fieldset>
          )}

          {isVerb && (
            <fieldset className="grid gap-5 rounded-md border border-line p-4 sm:grid-cols-2">
              <legend className="px-1 text-sm font-medium">Verbo</legend>
              <Field label="Prefijo separable" htmlFor="separablePrefix" error={err("separablePrefix")} hint="Solo si es separable: ab">
                <Input {...text("separablePrefix")} lang="de" />
              </Field>
              <Field label="Tercera persona" htmlFor="thirdPerson" error={err("thirdPerson")} hint="biegt ab">
                <Input {...text("thirdPerson")} lang="de" />
              </Field>
              <Field label="Perfekt" htmlFor="perfekt" error={err("perfekt")} hint="ist abgebogen">
                <Input {...text("perfekt")} lang="de" />
              </Field>
              <Field label="Auxiliar" htmlFor="auxiliary" error={err("auxiliary")}>
                <Select id="auxiliary" name="auxiliary" value={v.auxiliary ?? ""} onChange={(e) => set("auxiliary", (e.target.value || null) as WordFormValues["auxiliary"])}>
                  <option value="">—</option>
                  <option value="HABEN">haben</option>
                  <option value="SEIN">sein</option>
                </Select>
              </Field>
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <input type="checkbox" name="isIrregular" checked={v.isIrregular} onChange={(e) => set("isIrregular", e.target.checked)} className="size-4 accent-[var(--accent)]" />
                Irregular
              </label>
            </fieldset>
          )}

          <Field label="Traducción al español" htmlFor="translationEs" error={err("translationEs")} hint="Alternativas separadas por « / » (máx. 5). Lo que va entre paréntesis es aclaración.">
            <Input {...text("translationEs")} required />
          </Field>

          {(isExpr || v.clozeText) && (
            <Field label="Frase con hueco" htmlFor="clozeText" error={err("clozeText")} hint="Marca exactamente un hueco: Wie {{komme}} ich zum Bahnhof?">
              <Input {...text("clozeText")} lang="de" />
            </Field>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Ejemplo en alemán" htmlFor="exampleDe" error={err("exampleDe")}>
              <Textarea {...text("exampleDe")} lang="de" rows={2} />
            </Field>
            <Field label="Traducción del ejemplo" htmlFor="exampleEs" error={err("exampleEs")}>
              <Textarea {...text("exampleEs")} rows={2} />
            </Field>
          </div>
        </Card>

        <Card className="grid gap-5 p-5">
          <div className="grid gap-5 sm:grid-cols-3">
            <Field label="Nivel" htmlFor="level" error={err("level")}>
              <Select id="level" name="level" value={v.level} onChange={(e) => set("level", e.target.value as WordFormValues["level"])}>
                <option value="A">A · alta frecuencia</option>
                <option value="B">B · clave en los textos</option>
                <option value="C">C · específico</option>
              </Select>
            </Field>
            <Field label="Lección" htmlFor="lessonNumber" error={err("lessonNumber")}>
              <Select id="lessonNumber" name="lessonNumber" value={v.lessonNumber ?? ""} onChange={(e) => set("lessonNumber", e.target.value ? Number(e.target.value) : null)}>
                <option value="">Sin lección</option>
                {lessons.map((l) => (
                  <option key={l.number} value={l.number}>
                    {l.number} · {l.title}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Rige caso" htmlFor="governsCase" hint="Dat., Akk., Dat./Akk.">
              <Input {...text("governsCase")} />
            </Field>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" name="starred" checked={v.starred} onChange={(e) => set("starred", e.target.checked)} className="size-4 accent-[var(--accent)]" />
              Prioritaria (★)
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" name="isCognate" checked={v.isCognate} onChange={(e) => set("isCognate", e.target.checked)} className="size-4 accent-[var(--accent)]" />
              Cognado transparente
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" name="isFalseFriend" checked={v.isFalseFriend} onChange={(e) => set("isFalseFriend", e.target.checked)} className="size-4 accent-[var(--accent)]" />
              Falso amigo
            </label>
          </div>
          {v.isFalseFriend && (
            <Field label="Nota del falso amigo" htmlFor="falseFriendNote" error={err("falseFriendNote")}>
              <Input {...text("falseFriendNote")} />
            </Field>
          )}
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Etiquetas" htmlFor="tags" hint="Separadas por comas">
              <Input id="tags" name="tags" value={v.tags.join(", ")} onChange={(e) => set("tags", e.target.value.split(",").map((s) => s.trimStart()))} />
            </Field>
            <Field label="Fuentes" htmlFor="sources" hint="KB13, AB13, CLASE3…">
              <Input id="sources" name="sources" value={v.sources.join(", ")} onChange={(e) => set("sources", e.target.value.split(",").map((s) => s.trimStart()))} />
            </Field>
          </div>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" size="lg" loading={pending}>
            {submitLabel}
          </Button>
        </div>
      </div>

      <aside className="lg:sticky lg:top-20 lg:self-start">
        <Label className="mb-2 block text-ink-2">Vista previa de la tarjeta</Label>
        <Card raised className="overflow-hidden">
          <p className="border-b border-line px-4 py-2 text-xs text-ink-2">{CARD_KIND_LABELS[firstKind]}</p>
          <div className="flex min-h-32 flex-col items-center justify-center gap-1 px-4 py-6 text-center">
            {prompt.showGender && v.gender ? (
              <WordDisplay word={previewWord} size="lg" />
            ) : (
              <p className="font-serif text-2xl">{prompt.title}</p>
            )}
            {prompt.subtitle && <p className="text-xs text-ink-2">{prompt.subtitle}</p>}
          </div>
          <div className="border-t border-line bg-surface-2 px-4 py-3 text-sm">
            <span className="text-ink-2">Respuesta: </span>
            <span lang="de" className="font-serif">
              {expectedAnswer(firstKind, previewWord) || "…"}
            </span>
          </div>
        </Card>
        <p className="mt-3 text-xs text-ink-2">Tarjetas que se generarán: {kinds.map((k) => CARD_KIND_LABELS[k]).join(" · ")}</p>
      </aside>
    </form>
  );
}
