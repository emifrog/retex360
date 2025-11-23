import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createUser() {
  // 1. Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: 'xavier@sdis06.fr',
    password: 'password123',
    email_confirm: true,
    user_metadata: {
      name: 'Xavier Durand',
    }
  })

  if (authError) {
    console.error('❌ Error creating auth user:', authError)
    return
  }

  console.log('✅ Auth user created:', authData.user.id)

  // 2. Get SDIS 06
  const { data: sdis, error: sdisError } = await supabase
    .from('sdis')
    .select('id')
    .eq('code', 'SDIS06')
    .single()

  if (sdisError || !sdis) {
    console.error('❌ SDIS 06 not found. Please run the schema.sql first.')
    return
  }

  // 3. Create user profile in users table
  const { error: profileError } = await supabase
    .from('users')
    .insert({
      id: authData.user.id, // Use the same ID as auth user
      email: 'xavier@sdis06.fr',
      name: 'Xavier Durand',
      role: 'OFFICER',
      sdis_id: sdis.id,
    })

  if (profileError) {
    console.error('❌ Error creating user profile:', profileError)
    return
  }

  console.log('✅ User profile created')
  console.log('📧 Email: xavier@sdis06.fr')
  console.log('🔑 Password: password123')
}

createUser()
  .then(() => {
    console.log('✅ User creation complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  })
