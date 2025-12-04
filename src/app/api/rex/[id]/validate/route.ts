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

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin' && profile?.role !== 'super_admin') {
      return NextResponse.json({ message: 'Accès refusé' }, { status: 403 });
    }

    const body = await request.json();
    const { action, reason } = body;

    if (action === 'validate') {
      const { error } = await supabase
        .from('rex')
        .update({
          status: 'validated',
          validated_by: user.id,
          validated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        console.error('Validation error:', error);
        return NextResponse.json({ message: error.message }, { status: 500 });
      }

      // TODO: Send notification to author

      return NextResponse.json({ success: true, message: 'REX validé' });
    }

    if (action === 'reject') {
      const { error } = await supabase
        .from('rex')
        .update({
          status: 'draft', // Back to draft so author can edit
          rejection_reason: reason,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        console.error('Rejection error:', error);
        return NextResponse.json({ message: error.message }, { status: 500 });
      }

      // TODO: Send notification to author with rejection reason

      return NextResponse.json({ success: true, message: 'REX rejeté' });
    }

    return NextResponse.json({ message: 'Action invalide' }, { status: 400 });
  } catch (error) {
    console.error('Validation error:', error);
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 });
  }
}
