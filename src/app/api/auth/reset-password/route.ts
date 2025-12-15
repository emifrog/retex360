import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const resetPasswordSchema = z.object({
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validation Zod
    const validated = resetPasswordSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.issues[0].message },
        { status: 400 }
      );
    }

    const { password } = validated.data;
    const supabase = await createClient();

    // Check if user is authenticated (via recovery link)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Session invalide ou expirée. Veuillez demander un nouveau lien.' },
        { status: 401 }
      );
    }

    // Update password
    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    if (error) {
      console.error('Reset password error:', error);
      
      if (error.message.includes('same')) {
        return NextResponse.json(
          { error: 'Le nouveau mot de passe doit être différent de l\'ancien' },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { error: 'Erreur lors de la réinitialisation du mot de passe' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
