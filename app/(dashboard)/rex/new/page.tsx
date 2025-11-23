import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/auth";
import { RexForm } from "@/components/rex/rex-form";

export const metadata: Metadata = {
  title: "Nouveau REX | RETEX Connect",
  description: "Créer un nouveau retour d'expérience",
};

export default async function NewRexPage() {
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="container max-w-5xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          Nouveau retour d&apos;expérience
        </h1>
        <p className="text-muted-foreground mt-2">
          Créez un nouveau REX pour partager votre expérience avec vos collègues
        </p>
      </div>

      <RexForm mode="create" />
    </div>
  );
}
