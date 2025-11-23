import { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { getUser } from "@/lib/supabase/auth";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { RexForm } from "@/components/rex/rex-form";

export const metadata: Metadata = {
  title: "Éditer un REX | RETEX Connect",
  description: "Modifier un retour d'expérience",
};

interface EditRexPageProps {
  params: {
    id: string;
  };
}

export default async function EditRexPage({ params }: EditRexPageProps) {
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  const supabase = createServerComponentClient({ cookies });

  // Récupérer le REX à éditer
  const { data: rex, error } = await supabase
    .from('rex')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error || !rex) {
    notFound();
  }

  // Vérifier que l'utilisateur est l'auteur
  if (rex.author_id !== user.id) {
    redirect("/rex");
  }

  // Récupérer les tags
  const { data: tagRelations } = await supabase
    .from('rex_tags')
    .select(`
      tag:tag_id (
        id,
        name
      )
    `)
    .eq('rex_id', params.id);

  // Récupérer les pièces jointes
  const { data: attachments } = await supabase
    .from('rex_attachments')
    .select('*')
    .eq('rex_id', params.id);

  // Préparer les données initiales pour le formulaire
  const initialData = {
    title: rex.title,
    type: rex.type,
    date: new Date(rex.date),
    location: rex.location,
    description: rex.description,
    context: rex.context || undefined,
    actions: rex.actions || undefined,
    results: rex.results || undefined,
    analysis: rex.analysis,
    recommendations: rex.recommendations || undefined,
    gravity: rex.gravity,
    visibility: rex.visibility,
    resources: rex.resources || undefined,
    status: rex.status,
    tags: tagRelations?.map((tr: any) => ({ name: tr.tag.name })) || [],
    attachments: attachments?.map((a) => ({
      name: a.name,
      url: a.url,
      type: a.type,
      size: a.size,
    })) || [],
  };

  return (
    <div className="container max-w-5xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          Éditer le retour d&apos;expérience
        </h1>
        <p className="text-muted-foreground mt-2">
          Modifiez les informations de votre REX
        </p>
      </div>

      <RexForm mode="edit" rexId={params.id} initialData={initialData} />
    </div>
  );
}
