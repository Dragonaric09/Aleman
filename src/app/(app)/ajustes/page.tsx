import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/card";
import { PasswordForm, SettingsForm } from "@/components/settings/settings-form";
import { requireUser } from "@/modules/auth";
import { getSettings } from "@/modules/settings";

export const metadata: Metadata = { title: "Ajustes" };

export default async function SettingsPage() {
  const user = await requireUser();
  const settings = await getSettings(user.id);
  return (
    <>
      <PageHeader eyebrow={user.email} title="Ajustes" description="Los valores por defecto son puntos de partida razonables: ajústalos con tu experiencia." />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <SettingsForm settings={settings} />
        <div className="lg:sticky lg:top-20 lg:self-start">
          <PasswordForm />
        </div>
      </div>
    </>
  );
}
