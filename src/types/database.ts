export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      sdis: {
        Row: {
          id: string;
          code: string;
          name: string;
          region: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          region?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string;
          region?: string | null;
          created_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          sdis_id: string;
          email: string;
          full_name: string;
          role: 'user' | 'validator' | 'admin' | 'super_admin';
          grade: string | null;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          sdis_id: string;
          email: string;
          full_name: string;
          role?: 'user' | 'validator' | 'admin' | 'super_admin';
          grade?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          sdis_id?: string;
          email?: string;
          full_name?: string;
          role?: 'user' | 'validator' | 'admin' | 'super_admin';
          grade?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        };
      };
      rex: {
        Row: {
          id: string;
          sdis_id: string;
          author_id: string;
          title: string;
          slug: string | null;
          intervention_date: string;
          type: string;
          severity: 'critique' | 'majeur' | 'significatif';
          status: 'draft' | 'pending' | 'validated' | 'archived';
          visibility: 'sdis' | 'inter_sdis' | 'public';
          description: string | null;
          context: string | null;
          means_deployed: string | null;
          difficulties: string | null;
          lessons_learned: string | null;
          tags: string[];
          views_count: number;
          favorites_count: number;
          embedding: number[] | null;
          validated_by: string | null;
          validated_at: string | null;
          rejection_reason: string | null;
          created_at: string;
          updated_at: string;
          // DGSCGC fields
          type_production: 'signalement' | 'pex' | 'retex';
          message_ambiance: string | null;
          sitac: string | null;
          elements_favorables: string | null;
          elements_defavorables: string | null;
          documentation_operationnelle: string | null;
          // Plans types DGSCGC — annexes D et E (migration 023)
          intervention_heure: string | null;
          localisation: string | null;
          commune: string | null;
          objectifs: string | null;
          donnees_sources: string | null;
          methode_argumentation: string | null;
          focus_thematiques: Json | null;
          key_figures: Json | null;
          chronologie: Json | null;
          prescriptions: Json | null;
          temoignages: Json | null;
          description_site: string | null;
          ressources_complementaires: Json | null;
          numero_rex: string | null;
        };
        Insert: {
          id?: string;
          sdis_id: string;
          author_id: string;
          title: string;
          slug?: string | null;
          intervention_date: string;
          type: string;
          severity: 'critique' | 'majeur' | 'significatif';
          status?: 'draft' | 'pending' | 'validated' | 'archived';
          visibility?: 'sdis' | 'inter_sdis' | 'public';
          description?: string | null;
          context?: string | null;
          means_deployed?: string | null;
          difficulties?: string | null;
          lessons_learned?: string | null;
          tags?: string[];
          views_count?: number;
          favorites_count?: number;
          embedding?: number[] | null;
          validated_by?: string | null;
          validated_at?: string | null;
          rejection_reason?: string | null;
          created_at?: string;
          updated_at?: string;
          // DGSCGC fields
          type_production?: 'signalement' | 'pex' | 'retex';
          message_ambiance?: string | null;
          sitac?: string | null;
          elements_favorables?: string | null;
          elements_defavorables?: string | null;
          documentation_operationnelle?: string | null;
          // Plans types DGSCGC — annexes D et E (migration 023)
          intervention_heure?: string | null;
          localisation?: string | null;
          commune?: string | null;
          objectifs?: string | null;
          donnees_sources?: string | null;
          methode_argumentation?: string | null;
          focus_thematiques?: Json | null;
          key_figures?: Json | null;
          chronologie?: Json | null;
          prescriptions?: Json | null;
          temoignages?: Json | null;
          description_site?: string | null;
          ressources_complementaires?: Json | null;
          numero_rex?: string | null;
        };
        Update: {
          id?: string;
          sdis_id?: string;
          author_id?: string;
          title?: string;
          slug?: string | null;
          intervention_date?: string;
          type?: string;
          severity?: 'critique' | 'majeur' | 'significatif';
          status?: 'draft' | 'pending' | 'validated' | 'archived';
          visibility?: 'sdis' | 'inter_sdis' | 'public';
          description?: string | null;
          context?: string | null;
          means_deployed?: string | null;
          difficulties?: string | null;
          lessons_learned?: string | null;
          tags?: string[];
          views_count?: number;
          favorites_count?: number;
          embedding?: number[] | null;
          validated_by?: string | null;
          validated_at?: string | null;
          rejection_reason?: string | null;
          created_at?: string;
          updated_at?: string;
          // DGSCGC fields
          type_production?: 'signalement' | 'pex' | 'retex';
          message_ambiance?: string | null;
          sitac?: string | null;
          elements_favorables?: string | null;
          elements_defavorables?: string | null;
          documentation_operationnelle?: string | null;
          // Plans types DGSCGC — annexes D et E (migration 023)
          intervention_heure?: string | null;
          localisation?: string | null;
          commune?: string | null;
          objectifs?: string | null;
          donnees_sources?: string | null;
          methode_argumentation?: string | null;
          focus_thematiques?: Json | null;
          key_figures?: Json | null;
          chronologie?: Json | null;
          prescriptions?: Json | null;
          temoignages?: Json | null;
          description_site?: string | null;
          ressources_complementaires?: Json | null;
          numero_rex?: string | null;
        };
      };
      rex_attachments: {
        Row: {
          id: string;
          rex_id: string;
          uploaded_by: string;
          file_name: string;
          file_type: string | null;
          file_size: number | null;
          storage_path: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          rex_id: string;
          uploaded_by: string;
          file_name: string;
          file_type?: string | null;
          file_size?: number | null;
          storage_path: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          rex_id?: string;
          uploaded_by?: string;
          file_name?: string;
          file_type?: string | null;
          file_size?: number | null;
          storage_path?: string;
          created_at?: string;
        };
      };
      comments: {
        Row: {
          id: string;
          rex_id: string;
          author_id: string;
          parent_id: string | null;
          content: string;
          mentions: string[];
          is_edited: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          rex_id: string;
          author_id: string;
          parent_id?: string | null;
          content: string;
          mentions?: string[];
          is_edited?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          rex_id?: string;
          author_id?: string;
          parent_id?: string | null;
          content?: string;
          mentions?: string[];
          is_edited?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      favorites: {
        Row: {
          id: string;
          user_id: string;
          rex_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          rex_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          rex_id?: string;
          created_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          title: string | null;
          content: string | null;
          link: string | null;
          rex_id: string | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          title?: string | null;
          content?: string | null;
          link?: string | null;
          rex_id?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: string;
          title?: string | null;
          content?: string | null;
          link?: string | null;
          rex_id?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};

// Convenience types
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type InsertTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type UpdateTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];

// Specific types
export type Sdis = Tables<'sdis'>;
export type Profile = Tables<'profiles'>;

/**
 * Profil tel qu'un utilisateur authentifié peut le LIRE.
 *
 * `email` en est absent depuis la migration 024 : la colonne ne fait plus partie
 * des privilèges du rôle `authenticated`. La raison est que la policy SELECT de
 * `profiles` rend la ligne d'un auteur de REX partagé visible hors de son SDIS —
 * pour afficher son nom — et qu'une policy filtre des lignes, jamais des
 * colonnes : l'adresse suivait.
 *
 * L'adresse de l'utilisateur courant se lit sur la session
 * (`supabase.auth.getUser()`) ; les flux d'administration (invitations, exports)
 * passent par le rôle service, que ces privilèges ne concernent pas.
 *
 * C'est donc ce type, et non `Profile`, qu'attendent les composants nourris par
 * une requête faite avec le client utilisateur.
 */
export type ReadableProfile = Omit<Profile, 'email'>;

/**
 * Profil de l'utilisateur connecté, tel que `getUser()` le compose : ce que
 * `profiles` accepte de rendre, plus son SDIS et son adresse.
 *
 * L'adresse vient de la SESSION (`supabase.auth.getUser()`) et non de la table :
 * c'en est la source de vérité, et c'est le seul endroit où le client
 * utilisateur peut encore la lire. Elle est nullable parce que Supabase la
 * déclare ainsi — un compte sans adresse ne peut pas exister dans cette
 * application, mais rien dans les types ne le garantit.
 */
export type SessionProfile = ReadableProfile & {
  sdis: Sdis | null;
  email: string | null;
};
export type Rex = Tables<'rex'>;
export type RexAttachment = Tables<'rex_attachments'>;
export type Comment = Tables<'comments'>;
export type Favorite = Tables<'favorites'>;
export type Notification = Tables<'notifications'>;

// Extended types with relations
export type RexWithAuthor = Rex & {
  author: Profile;
  sdis: Sdis;
};

export type CommentWithAuthor = Comment & {
  author: Profile;
  replies?: CommentWithAuthor[];
};
