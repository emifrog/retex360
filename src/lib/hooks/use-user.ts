'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Profile, Sdis } from '@/types';

export type UserWithSdis = Profile & {
  sdis: Sdis;
};

export function useUser() {
  const supabase = createClient();

  return useQuery({
    queryKey: ['user'],
    queryFn: async (): Promise<UserWithSdis | null> => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return null;

      const { data: profile } = await supabase
        .from('profiles')
        .select('*, sdis:sdis_id(*)')
        .eq('id', user.id)
        .single();

      return profile as UserWithSdis | null;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
