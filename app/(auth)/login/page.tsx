import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const params = await searchParams
  async function authenticate(formData: FormData) {
    'use server'

    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const supabase = await createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      redirect('/login?error=CredentialsSignin')
    }

    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-red-600 to-red-800 p-12 flex-col justify-between">
        <div>
          <div className="flex items-center space-x-3 mb-12">
            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center">
              <span className="text-3xl">🔥</span>
            </div>
            <div>
              <div className="text-white text-2xl font-bold">REX Platform</div>
              <div className="text-red-200 text-sm">Retours d&apos;Expérience SDIS</div>
            </div>
          </div>
          <div className="text-white">
            <h1 className="text-4xl font-bold mb-6">
              Capitalisez sur l&apos;expérience de tous les SDIS de France
            </h1>
            <p className="text-red-100 text-lg mb-8">
              Partagez, apprenez et améliorez vos interventions grâce à une plateforme 
              collaborative intelligente.
            </p>
          </div>
        </div>
        <div className="text-red-200 text-sm">
          © 2025 REX Platform • Sécurisé et conforme RGPD
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="max-w-md w-full">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Connexion</h2>
          <p className="text-gray-600 mb-8">Accédez à votre espace SDIS</p>

          {params.error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">
                {params.error === 'CredentialsSignin' 
                  ? 'Email ou mot de passe incorrect'
                  : 'Une erreur est survenue'}
              </p>
            </div>
          )}

          <form action={authenticate} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Adresse email
              </label>
              <Input 
                type="email"
                name="email"
                required
                placeholder="votre.email@sdis.fr"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mot de passe
              </label>
              <Input 
                type="password"
                name="password"
                required
                placeholder="••••••••"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                />
                <span className="ml-2 text-sm text-gray-600">Se souvenir de moi</span>
              </label>
              <a href="#" className="text-sm text-red-600 hover:text-red-700 font-medium">
                Mot de passe oublié ?
              </a>
            </div>

            <Button type="submit" className="w-full" size="lg">
              Se connecter
            </Button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Ou continuer avec</span>
              </div>
            </div>

            <div className="mt-6">
              {/* Removed Google Sign In */}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}