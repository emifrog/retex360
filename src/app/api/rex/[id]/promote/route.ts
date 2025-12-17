import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

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

    // Get existing REX
    const { data: rex, error: fetchError } = await supabase
      .from('rex')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !rex) {
      return NextResponse.json({ message: 'REX non trouvé' }, { status: 404 });
    }

    // Check permissions
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAuthor = rex.author_id === user.id;
    const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';

    if (!isAuthor && !isAdmin) {
      return NextResponse.json({ message: 'Non autorisé' }, { status: 403 });
    }

    const body = await request.json();
    const { targetType } = body;

    // Validate promotion path
    const validPromotions: Record<string, string> = {
      signalement: 'pex',
      pex: 'retex',
    };

    if (validPromotions[rex.type_production] !== targetType) {
      return NextResponse.json(
        { message: `Promotion invalide: ${rex.type_production} → ${targetType}` },
        { status: 400 }
      );
    }

    // Validate required fields for target type
    const requiredFields: Record<string, string[]> = {
      pex: ['context', 'means_deployed', 'lessons_learned'],
      retex: ['context', 'means_deployed', 'lessons_learned', 'focus_thematiques'],
    };

    const missingFields: string[] = [];
    for (const field of requiredFields[targetType] || []) {
      if (field === 'focus_thematiques') {
        if (!rex.focus_thematiques || rex.focus_thematiques.length === 0) {
          missingFields.push(field);
        }
      } else {
        const value = rex[field as keyof typeof rex];
        if (!value || (typeof value === 'string' && value.trim() === '')) {
          missingFields.push(field);
        }
      }
    }

    if (missingFields.length > 0) {
      return NextResponse.json(
        { message: `Champs manquants: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }

    // Perform promotion
    const { data: updatedRex, error: updateError } = await supabase
      .from('rex')
      .update({
        type_production: targetType,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error promoting REX:', updateError);
      return NextResponse.json({ message: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      message: `REX promu en ${targetType.toUpperCase()} avec succès`,
      rex: updatedRex,
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 });
  }
}
