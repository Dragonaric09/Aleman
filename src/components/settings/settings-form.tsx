"use client";

import * as Switch from "@radix-ui/react-switch";
import { Volume2 } from "lucide-react";
import { useActionState, useState } from "react";
import { changePasswordAction, updateSettingsAction } from "@/app/(app)/ajustes/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FormMessage, Input, Select } from "@/components/ui/form";
import type { ActionState } from "@/lib/action-result";
import { SETTINGS_RANGES, type Settings } from "@/modules/settings/shared";
import { CARD_KINDS, CARD_KIND_LABELS } from "@/modules/vocabulary/shared";
import { useGermanVoices } from "../study/use-speech";

function Toggle({ name, label, hint, defaultChecked }: { name: string; label: string; hint?: string; defaultChecked: boolean }) {
  const [on, setOn] = useState(defaultChecked);
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <label htmlFor={name} className="text-sm font-medium">
          {label}
        </label>
        {hint && <p className="text-xs text-ink-2">{hint}</p>}
      </div>
      <input type="hidden" name={name} value={on ? "true" : "false"} />
      <Switch.Root
        id={name}
        checked={on}
        onCheckedChange={setOn}
        className="relative h-6 w-11 shrink-0 rounded-full border border-line-strong bg-surface-2 transition-colors data-[state=checked]:border-accent data-[state=checked]:bg-accent"
      >
        <Switch.Thumb className="block size-5 translate-x-0.5 rounded-full bg-surface shadow-paper transition-transform data-[state=checked]:translate-x-[22px]" />
      </Switch.Root>
    </div>
  );
}

const TIMEZONES = ["America/La_Paz", "America/Lima", "America/Bogota", "America/Santiago", "America/Argentina/Buenos_Aires", "America/Mexico_City", "Europe/Madrid", "Europe/Berlin", "UTC"];

export function SettingsForm({ settings }: { settings: Settings }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updateSettingsAction, {});
  const { voices, ready } = useGermanVoices();
  const [voice, setVoice] = useState(settings.ttsVoice ?? "");
  const [rate, setRate] = useState(settings.ttsRate);
  const fe = state.fieldErrors ?? {};
  const R = SETTINGS_RANGES;
  const num = (name: keyof typeof R, label: string, hint: string, value: number) => (
    <Field label={label} htmlFor={name} hint={hint} error={fe[name]}>
      <Input
        id={name}
        name={name}
        type="number"
        inputMode="decimal"
        min={R[name].min}
        max={R[name].max}
        step={R[name].step}
        defaultValue={value}
        aria-invalid={!!fe[name] || undefined}
      />
    </Field>
  );

  function testVoice() {
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new SpeechSynthesisUtterance("Guten Tag! Wie komme ich zum Bahnhof?");
    u.lang = "de-DE";
    u.rate = rate;
    const v = voices.find((x) => x.name === voice) ?? voices[0];
    if (v) u.voice = v;
    synth.speak(u);
  }

  const tzOptions = TIMEZONES.includes(settings.timezone) ? TIMEZONES : [settings.timezone, ...TIMEZONES];

  return (
    <form action={action} className="grid gap-6" noValidate>
      {state.error && <FormMessage tone="error">{state.error}</FormMessage>}
      {state.ok && <FormMessage tone="ok">{state.message}</FormMessage>}

      <Card>
        <CardHeader>
          <CardTitle>Carga diaria</CardTitle>
          <CardDescription>Si los repasos pendientes superan el tope, no se introducen palabras nuevas.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-3">
          {num("newCardsPerDay", "Nuevas por día", "5 – 30", settings.newCardsPerDay)}
          {num("maxReviewsPerDay", "Repasos máximos por día", "50 – 999", settings.maxReviewsPerDay)}
          {num("reviewBacklogCap", "Tope de acumulación", "pendientes antes de bloquear nuevas", settings.reviewBacklogCap)}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Programación (FSRS)</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          {num("desiredRetention", "Retención deseada", "0,80 – 0,95 (más alta = más repasos)", settings.desiredRetention)}
          {num("maximumIntervalDays", "Intervalo máximo (días)", "por defecto 365", settings.maximumIntervalDays)}
          {num("dayStartsAtHour", "El día empieza a las", "hora local, 0 – 23", settings.dayStartsAtHour)}
          <Field label="Zona horaria" htmlFor="timezone" error={fe.timezone}>
            <Select id="timezone" name="timezone" defaultValue={settings.timezone}>
              {tzOptions.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </Select>
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tipos de tarjeta</CardTitle>
          <CardDescription>Desactivar un tipo lo saca de la cola sin borrar su historial.</CardDescription>
        </CardHeader>
        <CardContent>
          <fieldset className="grid gap-2 sm:grid-cols-2">
            <legend className="sr-only">Tipos de tarjeta activados</legend>
            {CARD_KINDS.map((k) => (
              <label key={k} className="flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm has-[:checked]:border-accent/60">
                <input type="checkbox" name="enabledCardKinds" value={k} defaultChecked={settings.enabledCardKinds.includes(k)} className="size-4 accent-[var(--accent)]" />
                {CARD_KIND_LABELS[k]}
              </label>
            ))}
          </fieldset>
          {fe.enabledCardKinds && (
            <p className="mt-2 text-xs text-bad" role="alert">
              {fe.enabledCardKinds}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Corrección y rebeldes</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5">
          <Toggle
            name="strictCapitalization"
            label="Mayúsculas estrictas"
            hint="Si está activo, «der bahnhof» cuenta como «casi» en lugar de correcto."
            defaultChecked={settings.strictCapitalization}
          />
          <div className="grid gap-5 sm:grid-cols-2">{num("leechThreshold", "Umbral de rebelde (lapsos)", "por defecto 6", settings.leechThreshold)}</div>
          <Toggle name="leechAutoSuspend" label="Suspender rebeldes automáticamente" defaultChecked={settings.leechAutoSuspend} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Voz</CardTitle>
          <CardDescription>Usa las voces alemanas instaladas en tu navegador o sistema.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          <Toggle name="ttsEnabled" label="Pronunciación activada" defaultChecked={settings.ttsEnabled} />
          <Toggle name="ttsAutoplay" label="Reproducir al revelar la respuesta" defaultChecked={settings.ttsAutoplay} />
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Voz alemana" htmlFor="ttsVoice" hint={ready && voices.length === 0 ? "No hay voces alemanas en este navegador." : undefined}>
              <Select id="ttsVoice" name="ttsVoice" value={voice} onChange={(e) => setVoice(e.target.value)}>
                <option value="">Automática</option>
                {voices.map((v) => (
                  <option key={v.name} value={v.name}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={`Velocidad: ${rate.toFixed(2).replace(".", ",")}`} htmlFor="ttsRate" error={fe.ttsRate}>
              <input
                id="ttsRate"
                name="ttsRate"
                type="range"
                min={R.ttsRate.min}
                max={R.ttsRate.max}
                step={R.ttsRate.step}
                value={rate}
                onChange={(e) => setRate(Number(e.target.value))}
                className="h-10 accent-[var(--accent)]"
              />
            </Field>
          </div>
          <div>
            <Button type="button" variant="secondary" size="sm" onClick={testVoice} disabled={voices.length === 0}>
              <Volume2 aria-hidden /> Probar audio
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" size="lg" loading={pending}>
          Guardar ajustes
        </Button>
      </div>
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(changePasswordAction, {});
  const fe = state.fieldErrors ?? {};
  return (
    <Card>
      <CardHeader>
        <CardTitle>Cambiar contraseña</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid gap-4" noValidate>
          {state.error && <FormMessage tone="error">{state.error}</FormMessage>}
          {state.ok && <FormMessage tone="ok">{state.message}</FormMessage>}
          <Field label="Contraseña actual" htmlFor="currentPassword" error={fe.currentPassword}>
            <Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" />
          </Field>
          <Field label="Nueva contraseña" htmlFor="newPassword" hint="Mínimo 10 caracteres." error={fe.newPassword}>
            <Input id="newPassword" name="newPassword" type="password" autoComplete="new-password" minLength={10} />
          </Field>
          <Field label="Repite la nueva contraseña" htmlFor="confirmPassword" error={fe.confirmPassword}>
            <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" />
          </Field>
          <Button type="submit" variant="secondary" loading={pending}>
            Cambiar contraseña
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
