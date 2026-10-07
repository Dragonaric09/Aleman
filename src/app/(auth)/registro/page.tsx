import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, registrationAllowed } from "@/modules/auth";
import { RegisterForm } from "../auth-forms";

export const metadata: Metadata = { title: "Crear cuenta" };
export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  if (!registrationAllowed()) {
    return (
      <>
        <h1 className="font-serif text-3xl font-semibold tracking-tight">Registro cerrado</h1>
        <p className="mt-2 text-ink-2">
          Esta instalación no admite cuentas nuevas.{" "}
          <Link href="/login" className="text-accent underline-offset-4 hover:underline">
            Volver a entrar
          </Link>
        </p>
      </>
    );
  }
  if (await getCurrentUser()) redirect("/");
  return (
    <>
      <h1 className="font-serif text-3xl font-semibold tracking-tight">Crea tu cuaderno</h1>
      <p className="mt-2 mb-8 text-ink-2">Tus palabras, notas y repasos quedan solo en tu cuenta.</p>
      <RegisterForm />
    </>
  );
}
