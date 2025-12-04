import { createClient, createAdminClient } from '@/lib/supabase/server';
import { generateRexEmbedding } from '@/lib/openai';
import { NextResponse } from 'next/server';

// POST - Generate and store embedding for a REX
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ message: 'Non autorisé' }, { status: 401 });
    }

    // Get REX data
    const { data: rex, error: rexError } = await supabase
      .from('rex')
      .select('title, description, context, lessons_learned, tags')
      .eq('id', id)
      .single();

    if (rexError || !rex) {
      return NextResponse.json({ message: 'REX non trouvé' }, { status: 404 });
    }

    // Generate embedding
    const embedding = await generateRexEmbedding(rex);

    // Store embedding using admin client (bypass RLS)
    const adminClient = createAdminClient();
    const { error: updateError } = await adminClient
      .from('rex')
      .update({ embedding })
      .eq('id', id);

    if (updateError) {
      console.error('Error storing embedding:', updateError);
      return NextResponse.json({ message: 'Erreur lors de la sauvegarde' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Embedding généré' });
  } catch (error) {
    console.error('Embedding error:', error);
    return NextResponse.json({ message: 'Erreur de génération' }, { status: 500 });
  }
}
