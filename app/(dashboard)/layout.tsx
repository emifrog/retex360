import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  // Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Get user data with SDIS info
  const { data: userData } = await supabase
    .from('users')
    .select(`
      name,
      role,
      sdis:sdis_id(code)
    `)
    .eq('id', user.id)
    .single()

  // Get user's REX count
  const { count: rexCount } = await supabase
    .from('rex')
    .select('*', { count: 'exact', head: true })
    .eq('author_id', user.id)

  const sdisData = userData?.sdis as unknown as { code: string } | null

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        user={{
          name: userData?.name || null,
          email: user.email || '',
          role: userData?.role || null,
          sdisCode: sdisData?.code || null,
        }}
        rexCount={rexCount || 0}
      />
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  )
}
