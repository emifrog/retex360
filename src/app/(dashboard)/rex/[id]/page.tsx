import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { RexDetail } from '@/components/rex/rex-detail';

interface RexPageProps {
  params: Promise<{ id: string }>;
}

export default async function RexPage({ params }: RexPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch REX with author, SDIS, and attachments
  const { data: rex, error } = await supabase
    .from('rex')
    .select(`
      *,
      author:profiles!author_id(id, full_name, grade, email, avatar_url),
      sdis:sdis!sdis_id(id, code, name, region),
      validator:profiles!validated_by(id, full_name, grade),
      attachments(id, file_name, file_type, file_size, file_url, created_at)
    `)
    .eq('id', id)
    .single();

  if (error || !rex) {
    notFound();
  }

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

  return (
    <RexDetail 
      rex={rex} 
      isFavorited={isFavorited}
      currentUser={currentUserProfile}
    />
  );
}
