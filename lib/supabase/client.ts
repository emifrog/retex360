import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';

// Client pour les composants Client
export const createBrowserClient = () => {
  return createClientComponentClient();
};

// Client pour les Server Components et API Routes
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Types pour la base de données
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          name: string | null;
          rank: string | null;
          unit: string | null;
          matricule: string | null;
          role: 'USER' | 'VALIDATOR' | 'ADMIN' | 'SUPER_ADMIN';
          sdis_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['users']['Insert']>;
      };
      rex: {
        Row: {
          id: string;
          title: string;
          type: 'INTERVENTION' | 'EXERCICE' | 'FORMATION' | 'TECHNIQUE' | 'ORGANISATIONNEL' | 'AUTRE';
          date: string;
          location: string;
          description: string;
          context: string | null;
          actions: string | null;
          results: string | null;
          analysis: string;
          recommendations: string | null;
          resources: string | null;
          gravity: 'SANS_GRAVITE' | 'FAIBLE' | 'MODEREE' | 'GRAVE' | 'TRES_GRAVE';
          visibility: 'PRIVE' | 'SDIS' | 'REGIONAL' | 'NATIONAL';
          status: 'BROUILLON' | 'EN_ATTENTE' | 'VALIDE' | 'REJETE' | 'ARCHIVE';
          author_id: string;
          sdis_id: string;
          validated_at: string | null;
          validated_by_id: string | null;
          rejection_reason: string | null;
          view_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['rex']['Row'], 'id' | 'created_at' | 'updated_at' | 'view_count'>;
        Update: Partial<Database['public']['Tables']['rex']['Insert']>;
      };
      rex_attachments: {
        Row: {
          id: string;
          rex_id: string;
          name: string;
          url: string;
          type: string;
          size: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['rex_attachments']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['rex_attachments']['Insert']>;
      };
      rex_tags: {
        Row: {
          id: string;
          rex_id: string;
          tag_id: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['rex_tags']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['rex_tags']['Insert']>;
      };
      tags: {
        Row: {
          id: string;
          name: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['tags']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['tags']['Insert']>;
      };
    };
  };
};
