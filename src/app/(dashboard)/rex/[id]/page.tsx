import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { RexDetail } from '@/components/rex/rex-detail';
import { logger } from '@/lib/logger';
import { signAttachmentUrls, thumbnailPathFor } from '@/lib/storage';
import { getSubscriptionState } from '@/lib/subscription';

interface RexPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: RexPageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();

  const { data: rex } = await supabase
    .from('rex')
    .select('title, description, type, intervention_date')
    .eq('id', id)
    .single();

  if (!rex) {
    return { title: 'RETEX non trouvé' };
  }

  const description = rex.description
    ? rex.description.replace(/<[^>]*>/g, '').slice(0, 160)
    : `RETEX ${rex.type} du ${new Date(rex.intervention_date).toLocaleDateString('fr-FR')}`;

  return {
    title: rex.title,
    description,
    openGraph: {
      title: rex.title,
      description,
      type: 'article',
      locale: 'fr_FR',
      siteName: 'RETEX360',
    },
    twitter: {
      card: 'summary',
      title: rex.title,
      description,
    },
  };
}

export default async function RexPage({ params }: RexPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // 1. Fetch REX (required for everything else)
  const { data: rex, error } = await supabase.from('rex').select('*').eq('id', id).single();

  if (error || !rex) {
    logger.error('REX fetch error:', error);
    notFound();
  }

  // 2. Parallel fetch: all independent queries at once
  const [
    { data: author },
    { data: sdis },
    validatorResult,
    { data: attachments },
    {
      data: { user },
    },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, grade, email, avatar_url')
      .eq('id', rex.author_id)
      .single(),
    supabase.from('sdis').select('id, code, name, region').eq('id', rex.sdis_id).single(),
    rex.validated_by
      ? supabase.from('profiles').select('id, full_name, grade').eq('id', rex.validated_by).single()
      : Promise.resolve({ data: null }),
    supabase
      .from('rex_attachments')
      .select('id, file_name, file_type, file_size, storage_path, created_at')
      .eq('rex_id', id),
    supabase.auth.getUser(),
  ]);

  const validator = validatorResult.data;

  // 3. Parallel fetch: user-dependent queries + fire-and-forget view count
  const [favoriteResult, profileResult] = user
    ? await Promise.all([
        supabase.from('favorites').select('id').eq('user_id', user.id).eq('rex_id', id).single(),
        supabase.from('profiles').select('*').eq('id', user.id).single(),
      ])
    : [{ data: null }, { data: null }];

  const isFavorited = !!favoriteResult.data;
  const currentUserProfile = profileResult.data;

  // Mode lecture seule (abonnement suspendu/expiré) : désactive les actions d'écriture.
  const canWrite =
    currentUserProfile?.role === 'super_admin'
      ? true
      : (await getSubscriptionState(currentUserProfile?.sdis_id)).canWrite;

  // Fire-and-forget: increment view count (no await needed)
  supabase
    .from('rex')
    .update({ views_count: (rex.views_count || 0) + 1 })
    .eq('id', id)
    .then();

  // Transform attachments with short-lived signed URLs (bucket is private).
  // Access is already gated: `attachments` was fetched via the RLS-bound client,
  // so it only contains files of a REX this user is allowed to see.
  const attachmentList = (attachments || []) as Array<{
    id: string;
    file_name: string;
    file_type: string;
    file_size: number;
    storage_path: string;
    created_at: string;
  }>;
  const hasThumbnail = (fileType: string) =>
    fileType?.startsWith('image/') && fileType !== 'image/gif';

  const pathsToSign = attachmentList.flatMap((att) =>
    hasThumbnail(att.file_type)
      ? [att.storage_path, thumbnailPathFor(att.storage_path)]
      : [att.storage_path]
  );
  const signedUrls = await signAttachmentUrls(pathsToSign);

  const rexWithAttachments = {
    ...rex,
    author,
    sdis,
    validator,
    attachments: attachmentList.map((att) => ({
      ...att,
      file_url: signedUrls.get(att.storage_path) ?? null,
      thumbnail_url: hasThumbnail(att.file_type)
        ? (signedUrls.get(thumbnailPathFor(att.storage_path)) ?? null)
        : null,
    })),
  };

  return (
    <RexDetail
      rex={rexWithAttachments}
      isFavorited={isFavorited}
      currentUser={currentUserProfile}
      canWrite={canWrite}
    />
  );
}
