import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { passwordChangeSchema } from '@/lib/validators/api';

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    // Validation Zod
    const validated = passwordChangeSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.issues[0].message },
        { status: 400 }
      );
    }

    // Check auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Update password using Supabase Auth
    const { error } = await supabase.auth.updateUser({
      password: validated.data.newPassword,
    });

    if (error) {
      console.error('Password update error:', error);
      
      if (error.message.includes('same')) {
        return NextResponse.json(
          { error: 'Le nouveau mot de passe doit être différent de l\'ancien' },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { error: 'Erreur lors du changement de mot de passe' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Password update error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
