import { ThemeToggle } from '@/components/theme-toggle';
import { CheckCircle } from 'lucide-react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary text-white flex-col justify-between p-12">
        <div>
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold">RETEX360 Platform</h1>
              <p className="text-xs text-white/70">Retours d&apos;Expérience SDIS</p>
            </div>
          </div>

          {/* Main Headline */}
          <div className="mt-16">
            <h2 className="text-4xl font-bold leading-tight">
              Capitalisez sur l&apos;expérience de tous les SDIS de France
            </h2>
            <p className="mt-4 text-white/80 text-lg">
              Partagez, apprenez et améliorez vos interventions grâce à une plateforme collaborative intelligente.
            </p>
          </div>

          {/* Features */}
          <div className="mt-12 space-y-6">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 mt-0.5 text-white/90" />
              <div>
                <h3 className="font-semibold">Recherche intelligente</h3>
                <p className="text-sm text-white/70">Trouvez instantanément les retex pertinents avec l&apos;IA</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 mt-0.5 text-white/90" />
              <div>
                <h3 className="font-semibold">Collaboration inter-SDIS</h3>
                <p className="text-sm text-white/70">Partagez les bonnes pratiques entre départements</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 mt-0.5 text-white/90" />
              <div>
                <h3 className="font-semibold">Analytics avancés</h3>
                <p className="text-sm text-white/70">Identifiez les tendances et prévenez les risques</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-sm text-white/60">
          © 2025 RETEX360 Platform • Sécurisé et conforme RGPD
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background relative">
        {/* Theme Toggle */}
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  );
}
