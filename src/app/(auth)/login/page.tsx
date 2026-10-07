import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, registrationAllowed } from "@/modules/auth";
import { LoginForm } from "../auth-forms";

export const metadata: Metadata = { title: "Entrar" };
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await getCurrentUser()) redirect("/");
  const { next } = await searchParams;
  return (
    <>
      <h1 className="font-serif text-3xl font-semibold tracking-tight">Willkommen zurück</h1>
      <p className="mt-2 mb-8 text-ink-2">Entra para seguir con tus repasos de hoy.</p>
      <LoginForm next={next ?? "/"} allowRegistration={registrationAllowed()} />
    </>
  );
}
