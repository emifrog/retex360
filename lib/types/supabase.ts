// Supabase types for REX application

export interface RexWithAuthor {
  id: string
  title: string
  description: string
  type: string
  severity: string
  status: string
  intervention_date: string
  location: string
  context: string
  actions: string
  outcome: string
  lessons: string
  recommendations: string
  category: string
  tags: string[]
  author_id: string
  sdis_id: string
  views: number
  ai_summary: string | null
  ai_keywords: string[]
  created_at: string
  updated_at: string
  published_at: string | null
  author?: {
    name: string
    email: string
  }
  _count?: {
    comments: number
  }
}

export interface RexWithDetails extends RexWithAuthor {
  comments?: Array<{
    id: string
    content: string
    author_id: string
    created_at: string
    updated_at: string
    author?: {
      name: string
      email: string
    }
  }>
  attachments?: Array<{
    id: string
    name: string
    url: string
    type: string
    size: number
    created_at: string
  }>
  sdis?: {
    code: string
    name: string
  }
}

export interface User {
  id: string
  email: string
  name: string
  role: 'ADMIN' | 'OFFICER' | 'AGENT'
  sdis_id: string
  created_at: string
  updated_at: string
  last_login_at: string | null
}

export interface SDIS {
  id: string
  code: string
  name: string
  department: string
  region: string
  plan: 'FREE' | 'PROFESSIONAL' | 'ENTERPRISE'
  created_at: string
  updated_at: string
}
