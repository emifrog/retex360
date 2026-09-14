'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toOne } from '@/lib/supabase/relations';
import type { SessionProfile, Sdis } from '@/types';

/** Pendant côté navigateur de `getUser()` : même composition, même contrat. */
export type UserWithSdis = SessionProfile;

export function useUser() {
  const supabase = createClient();

  return useQuery({
    queryKey: ['user'],
    queryFn: async (): Promise<UserWithSdis | null> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return null;

      // Colonnes énumérées : `select('*')` échoue depuis la migration 024, qui
      // retire `email` des privilèges de `authenticated`. L'adresse vient de la
      // session — c'en est la source de vérité, et la seule que le navigateur
      // ait le droit de lire.
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, sdis_id, full_name, role, grade, avatar_url, created_at, sdis:sdis_id(*)')
        .eq('id', user.id)
        .single();

      if (!profile) return null;

      // `toOne` : sans types générés, supabase-js infère la relation `sdis` en
      // tableau alors que PostgREST renvoie un objet (cf. `relations.ts`).
      return {
        ...profile,
        sdis: toOne<Sdis>(profile.sdis),
        email: user.email ?? null,
      } as UserWithSdis;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
