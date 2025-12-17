export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

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
          created_at: string;
          updated_at: string;
          // DGSCGC fields
          type_production: 'signalement' | 'pex' | 'retex';
          message_ambiance: string | null;
          sitac: string | null;
          elements_favorables: string | null;
          elements_defavorables: string | null;
          documentation_operationnelle: string | null;
          focus_thematiques: Json | null;
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
          created_at?: string;
          updated_at?: string;
          // DGSCGC fields
          type_production?: 'signalement' | 'pex' | 'retex';
          message_ambiance?: string | null;
          sitac?: string | null;
          elements_favorables?: string | null;
          elements_defavorables?: string | null;
          documentation_operationnelle?: string | null;
          focus_thematiques?: Json | null;
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
          created_at?: string;
          updated_at?: string;
          // DGSCGC fields
          type_production?: 'signalement' | 'pex' | 'retex';
          message_ambiance?: string | null;
          sitac?: string | null;
          elements_favorables?: string | null;
          elements_defavorables?: string | null;
          documentation_operationnelle?: string | null;
          focus_thematiques?: Json | null;
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
