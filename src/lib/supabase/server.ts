import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}

/**
 * Client SANS cookies, pour les données de référence lisibles par tous.
 *
 * `createClient()` lit les cookies, donc appelle `cookies()` — interdit à
 * l'intérieur d'`unstable_cache()`, qui refuse toute source dynamique : une
 * valeur mise en cache sous une clé globale ne peut pas dépendre de qui la
 * demande. Next lève une erreur de rendu plutôt que de laisser le premier
 * appelant décider de ce que verront les suivants.
 *
 * À réserver aux tables dont la policy de lecture ne dépend pas de l'appelant
 * (`sdis` : `FOR SELECT USING (true)`). Pour tout ce que la RLS filtre par
 * SDIS, ce client rendrait un résultat identique pour tous — soit exactement la
 * fuite que la RLS empêche. Dans ce cas, mettre en cache PAR SDIS avec un
 * filtre explicite (voir `dashboard/insights`).
 *
 * Clé anonyme, pas service role : la RLS s'applique toujours, et une donnée de
 * référence n'a aucune raison d'être lue avec des droits étendus.
 */
export function createStaticClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// Client admin avec service role (bypass RLS)
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
