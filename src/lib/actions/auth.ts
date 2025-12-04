'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { loginSchema, registerSchema } from '@/lib/validators/auth';

export async function login(formData: FormData) {
  const supabase = await createClient();

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  };

  const validated = loginSchema.safeParse(data);
  if (!validated.success) {
    return { error: validated.error.issues[0].message };
  }

  const { error } = await supabase.auth.signInWithPassword(validated.data);

  if (error) {
    return { error: 'Email ou mot de passe incorrect' };
  }

  redirect('/dashboard');
}

export async function register(formData: FormData) {
  const supabase = await createClient();

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    confirmPassword: formData.get('confirmPassword') as string,
    fullName: formData.get('fullName') as string,
    sdisId: formData.get('sdisId') as string,
    grade: formData.get('grade') as string || undefined,
  };

  console.log('Register data:', { ...data, password: '***', confirmPassword: '***' });

  const validated = registerSchema.safeParse(data);
  if (!validated.success) {
    console.log('Validation errors:', validated.error.issues);
    return { error: validated.error.issues[0].message };
  }

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: validated.data.email,
    password: validated.data.password,
  });

  if (authError) {
    return { error: authError.message };
  }

  if (authData.user) {
    // Utiliser le client admin pour bypasser RLS lors de la création du profil
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
      return { error: 'Erreur lors de la création du profil: ' + profileError.message };
    }
  }

  redirect('/dashboard');
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

export async function getUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, sdis:sdis_id(*)')
    .eq('id', user.id)
    .single();

  return profile;
}
