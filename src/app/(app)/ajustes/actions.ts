"use server";

import { revalidatePath } from "next/cache";
import { changePassword, currentSessionToken, requireUser } from "@/modules/auth";
import { updateSettings } from "@/modules/settings";
import { invalidateCardSync } from "@/modules/vocabulary";
import { bool, optStr, str, toActionError, type ActionState } from "@/lib/action-result";

export async function updateSettingsAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  try {
    await updateSettings(user.id, {
      newCardsPerDay: str(form, "newCardsPerDay"),
      maxReviewsPerDay: str(form, "maxReviewsPerDay"),
      reviewBacklogCap: str(form, "reviewBacklogCap"),
      desiredRetention: str(form, "desiredRetention").replace(",", "."),
      maximumIntervalDays: str(form, "maximumIntervalDays"),
      dayStartsAtHour: str(form, "dayStartsAtHour"),
      timezone: str(form, "timezone"),
      enabledCardKinds: form.getAll("enabledCardKinds").map(String),
      ttsEnabled: bool(form, "ttsEnabled"),
      ttsAutoplay: bool(form, "ttsAutoplay"),
      ttsRate: str(form, "ttsRate").replace(",", "."),
      ttsVoice: optStr(form, "ttsVoice"),
      strictCapitalization: bool(form, "strictCapitalization"),
      leechThreshold: str(form, "leechThreshold"),
      leechAutoSuspend: bool(form, "leechAutoSuspend"),
    });
  } catch (err) {
    return toActionError(err);
  }
  invalidateCardSync(user.id);
  revalidatePath("/", "layout");
  return { ok: true, message: "Ajustes guardados" };
}

export async function changePasswordAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  try {
    await changePassword(
      user.id,
      {
        currentPassword: str(form, "currentPassword"),
        newPassword: str(form, "newPassword"),
        confirmPassword: str(form, "confirmPassword"),
      },
      (await currentSessionToken()) ?? "",
    );
  } catch (err) {
    return toActionError(err);
  }
  return { ok: true, message: "Contraseña cambiada. Se cerraron tus otras sesiones." };
}
