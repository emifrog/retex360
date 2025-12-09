import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ROLES } from '@/types';

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { userId, role } = await request.json();

    // Validate role
    if (!ROLES.includes(role)) {
      return NextResponse.json({ error: 'Rôle invalide' }, { status: 400 });
    }

    // Check auth and admin role
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('role, sdis_id')
      .eq('id', user.id)
      .single();

    if (!currentProfile || !['admin', 'super_admin'].includes(currentProfile.role)) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    const isSuperAdmin = currentProfile.role === 'super_admin';

    // Get target user
    const { data: targetUser } = await supabase
      .from('profiles')
      .select('id, role, sdis_id')
      .eq('id', userId)
      .single();

    if (!targetUser) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    // Admin can only modify users from their SDIS
    if (!isSuperAdmin && targetUser.sdis_id !== currentProfile.sdis_id) {
      return NextResponse.json({ error: 'Non autorisé pour cet utilisateur' }, { status: 403 });
    }

    // Only super_admin can create super_admin
    if (role === 'super_admin' && !isSuperAdmin) {
      return NextResponse.json({ error: 'Seul un super admin peut créer un super admin' }, { status: 403 });
    }

    // Cannot demote yourself
    if (userId === user.id) {
      return NextResponse.json({ error: 'Vous ne pouvez pas modifier votre propre rôle' }, { status: 400 });
    }

    // Update role
    const { error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', userId);

    if (error) {
      console.error('Role update error:', error);
      return NextResponse.json({ error: 'Erreur lors de la modification' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Role update error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
