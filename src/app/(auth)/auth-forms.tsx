"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input } from "@/components/ui/form";
import type { ActionState } from "@/lib/action-result";
import { loginAction, registerAction } from "./actions";

export function LoginForm({ next, allowRegistration }: { next: string; allowRegistration: boolean }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(loginAction, {});
  return (
    <form action={action} className="grid gap-5" noValidate>
      <input type="hidden" name="next" value={next} />
      {state.error && <FormMessage tone="error">{state.error}</FormMessage>}
      <Field label="Email" htmlFor="email" error={state.fieldErrors?.email}>
        <Input id="email" name="email" type="email" autoComplete="email" required autoFocus aria-invalid={!!state.fieldErrors?.email} />
      </Field>
      <Field label="Contraseña" htmlFor="password" error={state.fieldErrors?.password}>
        <Input id="password" name="password" type="password" autoComplete="current-password" required aria-invalid={!!state.fieldErrors?.password} />
      </Field>
      <Button type="submit" size="lg" loading={pending}>
        Entrar
      </Button>
      {allowRegistration && (
        <p className="text-center text-sm text-ink-2">
          ¿Aún no tienes cuenta?{" "}
          <Link href="/registro" className="font-medium text-accent underline-offset-4 hover:underline">
            Crear una
          </Link>
        </p>
      )}
    </form>
  );
}

export function RegisterForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(registerAction, {});
  const [timezone, setTimezone] = useState("");
  useEffect(() => setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone), []);
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="grid gap-5" noValidate>
      <input type="hidden" name="timezone" value={timezone} />
      {state.error && <FormMessage tone="error">{state.error}</FormMessage>}
      <Field label="Nombre" htmlFor="displayName" error={fe.displayName}>
        <Input id="displayName" name="displayName" autoComplete="given-name" required autoFocus aria-invalid={!!fe.displayName} />
      </Field>
      <Field label="Email" htmlFor="email" error={fe.email}>
        <Input id="email" name="email" type="email" autoComplete="email" required aria-invalid={!!fe.email} />
      </Field>
      <Field label="Contraseña" htmlFor="password" hint="Mínimo 10 caracteres." error={fe.password}>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={10}
          required
          aria-invalid={!!fe.password}
          aria-describedby="password-hint"
        />
      </Field>
      <Button type="submit" size="lg" loading={pending}>
        Crear cuenta
      </Button>
      <p className="text-center text-sm text-ink-2">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="font-medium text-accent underline-offset-4 hover:underline">
          Entrar
        </Link>
      </p>
    </form>
  );
}
