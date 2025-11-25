// Types REX alignés avec le schéma SQL Supabase

export type RexType = 'INTERVENTION' | 'EXERCICE' | 'FORMATION' | 'TECHNIQUE' | 'ORGANISATIONNEL' | 'AUTRE'
export type RexGravity = 'SANS_GRAVITE' | 'FAIBLE' | 'MODEREE' | 'GRAVE' | 'TRES_GRAVE'
export type RexVisibility = 'PRIVE' | 'SDIS' | 'REGIONAL' | 'NATIONAL'
export type RexStatus = 'BROUILLON' | 'EN_ATTENTE' | 'VALIDE' | 'REJETE' | 'ARCHIVE'
export type RexCategory = 'FIRE' | 'RESCUE' | 'HAZMAT' | 'WATER_RESCUE' | 'ROAD_ACCIDENT' | 'NATURAL_DISASTER' | 'TECHNICAL' | 'OTHER'

// Structure des moyens engagés (stocké en JSONB dans le champ resources)
export interface RexResources {
  engins?: {
    type: string
    nombre: number
    description?: string
  }[]
  effectifs?: {
    grade: string
    nombre: number
  }[]
  autresMoyens?: string
}

// Auteur du REX
export interface RexAuthor {
  id: string
  name: string
  email: string
  rank?: string
  unit?: string
  image?: string
}

// SDIS associé
export interface RexSdis {
  id: string
  code: string
  name: string
  department?: string
  region?: string
}

// Tag
export interface RexTag {
  id: string
  name: string
}

// Commentaire
export interface RexComment {
  id: string
  content: string
  author_id: string
  rex_id: string
  parent_id?: string
  created_at: string
  updated_at: string
  author?: {
    id: string
    name: string
    rank?: string
    image?: string
  }
}

// Pièce jointe
export interface RexAttachment {
  id: string
  name: string
  url: string
  type: string
  size: number
  rex_id: string
  uploaded_by: string
  created_at: string
}

// REX de base (liste)
export interface Rex {
  id: string
  title: string
  description: string
  type: RexType
  status: RexStatus
  intervention_date: string
  location: string
  context: string
  actions: string
  outcome: string
  lessons: string
  recommendations: string
  category: RexCategory
  gravity?: RexGravity
  visibility?: RexVisibility
  resources?: RexResources | string
  author_id: string
  sdis_id: string
  view_count: number
  ai_summary?: string
  ai_keywords?: string[]
  validated_at?: string
  validated_by_id?: string
  rejection_reason?: string
  created_at: string
  updated_at: string
  published_at?: string
}

// REX avec auteur (pour la liste)
export interface RexWithAuthor extends Rex {
  author?: RexAuthor
  sdis?: RexSdis
  tags?: RexTag[]
  _count?: {
    comments: number
  }
}

// REX avec tous les détails (pour la page détail)
export interface RexWithDetails extends RexWithAuthor {
  comments?: RexComment[]
  attachments?: RexAttachment[]
  validated_by?: RexAuthor
}

// Filtres pour la liste des REX
export interface RexFilters {
  search?: string
  type?: RexType
  gravity?: RexGravity
  status?: RexStatus
  visibility?: RexVisibility
  category?: RexCategory
  authorId?: string
  sdisId?: string
  dateFrom?: string
  dateTo?: string
  tags?: string[]
}

// Options de tri
export type RexSortOption = 'recent' | 'oldest' | 'views' | 'gravity' | 'title'

// Paramètres de recherche de la page
export interface RexSearchParams {
  q?: string
  type?: string
  gravity?: string
  status?: string
  visibility?: string
  category?: string
  sort?: string
  page?: string
  dateFrom?: string
  dateTo?: string
}

// Résultat paginé
export interface PaginatedRexResult {
  rexList: RexWithAuthor[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}
