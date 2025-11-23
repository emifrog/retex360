import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function getSession() {
  const supabase = createServerComponentClient({ cookies });
  
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session;
}

export async function getUser() {
  const session = await getSession();
  
  if (!session?.user) {
    return null;
  }

  const supabase = createServerComponentClient({ cookies });
  
  // Récupérer les données complètes de l'utilisateur depuis la table users
  const { data: user, error } = await supabase
    .from('users')
    .select(`
      *,
      sdis:sdis_id (
        id,
        name,
        number,
        region
      )
    `)
    .eq('id', session.user.id)
    .single();

  if (error || !user) {
    return null;
  }

  return user;
}

export async function requireAuth() {
  const user = await getUser();
  
  if (!user) {
    redirect('/login');
  }
  
  return user;
}

export async function requireRole(roles: string[]) {
  const user = await requireAuth();
  
  if (!roles.includes(user.role)) {
    redirect('/unauthorized');
  }
  
  return user;
}
