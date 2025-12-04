import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ message: 'Non autorisé' }, { status: 401 });
    }

    // Get counts by status
    const [totalResult, validatedResult, pendingResult, draftResult] = await Promise.all([
      supabase.from('rex').select('id', { count: 'exact', head: true }),
      supabase.from('rex').select('id', { count: 'exact', head: true }).eq('status', 'validated'),
      supabase.from('rex').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('rex').select('id', { count: 'exact', head: true }).eq('status', 'draft'),
    ]);

    return NextResponse.json({
      total: totalResult.count || 0,
      validated: validatedResult.count || 0,
      pending: pendingResult.count || 0,
      draft: draftResult.count || 0,
    });
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 });
  }
}
