import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { RexDetail } from '@/components/rex/rex-detail';

interface RexPageProps {
  params: Promise<{ id: string }>;
}

export default async function RexPage({ params }: RexPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch REX basic data first
  const { data: rex, error } = await supabase
    .from('rex')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !rex) {
    console.error('REX fetch error:', error);
    notFound();
  }

  // Fetch related data separately
  const { data: author } = await supabase
    .from('profiles')
    .select('id, full_name, grade, email, avatar_url')
    .eq('id', rex.author_id)
    .single();

  const { data: sdis } = await supabase
    .from('sdis')
    .select('id, code, name, region')
    .eq('id', rex.sdis_id)
    .single();

  let validator = null;
  if (rex.validated_by) {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, grade')
      .eq('id', rex.validated_by)
      .single();
    validator = data;
  }

  const { data: attachments } = await supabase
    .from('rex_attachments')
    .select('id, file_name, file_type, file_size, storage_path, created_at')
    .eq('rex_id', id);

  // Combine all data
  const rexWithRelations = {
    ...rex,
    author,
    sdis,
    validator,
    rex_attachments: attachments || [],
  };

  // Increment view count
  await supabase
    .from('rex')
    .update({ views_count: (rex.views_count || 0) + 1 })
    .eq('id', id);

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  
  // Check if favorited
  let isFavorited = false;
  if (user) {
    const { data: favorite } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', user.id)
      .eq('rex_id', id)
      .single();
    isFavorited = !!favorite;
  }

  // Get current user profile
  let currentUserProfile = null;
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    currentUserProfile = profile;
  }

  // Transform rex_attachments to attachments for the component
  const rexWithAttachments = {
    ...rexWithRelations,
    attachments: rexWithRelations.rex_attachments?.map((att: { id: string; file_name: string; file_type: string; file_size: number; storage_path: string; created_at: string }) => ({
      ...att,
      file_url: att.storage_path, // Map storage_path to file_url
    })) || [],
  };

  return (
    <RexDetail 
      rex={rexWithAttachments} 
      isFavorited={isFavorited}
      currentUser={currentUserProfile}
    />
  );
}
