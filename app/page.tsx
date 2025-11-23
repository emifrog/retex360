import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-red-600 to-red-800">
      <div className="text-center text-white">
        <div className="mb-8 flex items-center justify-center space-x-3">
          <div className="h-16 w-16 rounded-2xl bg-white flex items-center justify-center">
            <span className="text-4xl">🔥</span>
          </div>
        </div>
        <h1 className="mb-4 text-5xl font-bold">REX Platform</h1>
        <p className="mb-8 text-xl text-red-100">
          Plateforme collaborative de Retours d&apos;Expérience
        </p>
        <p className="mb-12 text-lg text-red-200">
          Pour les SDIS de France
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/login">
            <Button size="lg" className="bg-white text-red-600 hover:bg-red-50">
              Se connecter
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
              Découvrir
            </Button>
          </Link>
        </div>
      </div>
      <div className="absolute bottom-8 text-red-200 text-sm">
        © 2025 REX Platform - Développé pour les Sapeurs-Pompiers
      </div>
    </div>
  )
}