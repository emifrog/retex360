'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { loginSchema } from '@/lib/validators/auth';
import { invitationRegisterSchema } from '@/lib/validators/api';
import { acceptInvitationAndRegister } from '@/lib/invitations';

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

  redirect('/');
}

// Inscription sur invitation uniquement : le SDIS et le rôle viennent de
// l'invitation, l'utilisateur ne choisit ni l'un ni l'autre.
export async function register(formData: FormData) {
  const supabase = await createClient();

  const data = {
    token: formData.get('token') as string,
    fullName: formData.get('fullName') as string,
    grade: (formData.get('grade') as string) || undefined,
    password: formData.get('password') as string,
    confirmPassword: formData.get('confirmPassword') as string,
  };

  const validated = invitationRegisterSchema.safeParse(data);
  if (!validated.success) {
    return { error: validated.error.issues[0].message };
  }

  const result = await acceptInvitationAndRegister({
    token: validated.data.token,
    password: validated.data.password,
    fullName: validated.data.fullName,
    grade: validated.data.grade ?? null,
  });
  if ('error' in result) {
    return { error: result.error };
  }

  // Établir la session puis rediriger.
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: result.email,
    password: validated.data.password,
  });
  if (signInError) {
    redirect('/login?registered=1');
  }

  redirect('/');
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, sdis:sdis_id(*)')
    .eq('id', user.id)
    .single();

  return profile;
}
