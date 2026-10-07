"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/modules/auth";
import {
  copyGlobalWord,
  createWord,
  deleteWord,
  resetCard,
  saveNote,
  setCardSuspended,
  setWordSuspended,
  updateWord,
} from "@/modules/vocabulary";
import { clock } from "@/server/clock";
import { bool, optInt, optStr, str, toActionError, type ActionState } from "@/lib/action-result";

function list(form: FormData, key: string) {
  return str(form, key)
    .split(/[|,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Convierte el formulario dinámico en la entrada cruda de wordInputSchema. */
function formToWord(form: FormData) {
  const type = str(form, "type");
  const lemma = str(form, "lemma");
  const separablePrefix = type === "VERB" ? optStr(form, "separablePrefix") : null;
  return {
    lemma,
    type,
    gender: type === "NOUN" ? optStr(form, "gender") : null,
    pluralSuffix: type === "NOUN" ? optStr(form, "pluralSuffix") : null,
    pluralForm: type === "NOUN" && !bool(form, "noPlural") ? optStr(form, "pluralForm") : null,
    noPlural: type === "NOUN" && bool(form, "noPlural"),
    translationEs: str(form, "translationEs"),
    exampleDe: optStr(form, "exampleDe"),
    exampleEs: optStr(form, "exampleEs"),
    clozeText: optStr(form, "clozeText"),
    level: str(form, "level"),
    starred: bool(form, "starred"),
    goetheLevel: optStr(form, "goetheLevel"),
    frequencyRank: optInt(form, "frequencyRank"),
    lessonNumber: optInt(form, "lessonNumber"),
    sources: list(form, "sources"),
    isCognate: bool(form, "isCognate"),
    isFalseFriend: bool(form, "isFalseFriend"),
    falseFriendNote: optStr(form, "falseFriendNote"),
    separablePrefix,
    thirdPerson: type === "VERB" ? optStr(form, "thirdPerson") : null,
    perfekt: type === "VERB" ? optStr(form, "perfekt") : null,
    auxiliary: type === "VERB" ? optStr(form, "auxiliary") : null,
    isIrregular: type === "VERB" && bool(form, "isIrregular"),
    governsCase: optStr(form, "governsCase"),
    tags: list(form, "tags"),
  };
}

export async function createWordAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  let id: string;
  try {
    id = (await createWord(user.id, formToWord(form))).id;
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath("/vocabulario");
  redirect(`/vocabulario/${id}`);
}

export async function updateWordAction(wordId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  try {
    await updateWord(user.id, wordId, formToWord(form));
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath(`/vocabulario/${wordId}`);
  return { ok: true, message: "Cambios guardados" };
}

export async function deleteWordAction(wordId: string) {
  const user = await requireUser();
  await deleteWord(user.id, wordId);
  revalidatePath("/vocabulario");
  redirect("/vocabulario");
}

export async function copyWordAction(wordId: string) {
  const user = await requireUser();
  const copy = await copyGlobalWord(user.id, wordId);
  revalidatePath("/vocabulario");
  redirect(`/vocabulario/${copy.id}?copia=1`);
}

export async function setWordSuspendedAction(wordId: string, suspended: boolean): Promise<ActionState> {
  const user = await requireUser();
  try {
    await setWordSuspended(user.id, wordId, suspended);
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath("/vocabulario");
  revalidatePath(`/vocabulario/${wordId}`);
  return { ok: true, message: suspended ? "Palabra suspendida" : "Palabra reactivada" };
}

export async function setCardSuspendedAction(cardId: string, suspended: boolean, path?: string): Promise<ActionState> {
  const user = await requireUser();
  try {
    await setCardSuspended(user.id, cardId, suspended);
  } catch (err) {
    return toActionError(err);
  }
  if (path) revalidatePath(path);
  return { ok: true };
}

export async function saveNoteAction(
  wordId: string,
  note: { mnemonic?: string | null; ownSentence?: string | null },
): Promise<ActionState> {
  const user = await requireUser();
  try {
    await saveNote(user.id, wordId, note);
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath(`/vocabulario/${wordId}`);
  revalidatePath("/rebeldes");
  return { ok: true, message: "Nota guardada" };
}

export async function resetCardAction(cardId: string): Promise<ActionState> {
  const user = await requireUser();
  try {
    await resetCard(user.id, cardId, clock.now());
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath("/rebeldes");
  return { ok: true, message: "Tarjeta reiniciada" };
}
