import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { rateLimiters, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { registerSchema } from '@/lib/validators/auth';

export async function POST(request: NextRequest) {
  // Rate limiting
  const ip = getClientIp(request);
  const rateLimitResult = await rateLimiters.auth.limit(ip);
  
  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult.reset);
  }

  try {
    const body = await request.json();
    
    // Validation Zod
    const validated = registerSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.issues[0].message },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: validated.data.email,
      password: validated.data.password,
    });

    if (authError) {
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      );
    }

    if (authData.user) {
      // Use admin client to bypass RLS for profile creation
      const adminClient = createAdminClient();
      const { error: profileError } = await adminClient.from('profiles').upsert({
        id: authData.user.id,
        email: validated.data.email,
        full_name: validated.data.fullName,
        sdis_id: validated.data.sdisId,
        grade: validated.data.grade,
      }, { onConflict: 'id' });

      if (profileError) {
        console.error('Profile error:', profileError);
        return NextResponse.json(
          { error: 'Erreur lors de la création du profil' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        id: authData.user?.id,
        email: authData.user?.email,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
