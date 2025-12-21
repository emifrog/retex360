import { 
  Shield, 
  Users, 
  FileText, 
  Brain, 
  Bell, 
  Search,
  CheckCircle,
  Heart,
  Zap,
  Globe,
  Lock,
  Sparkles,
  Clock,
  ClipboardCheck,
  BarChart3,
  FileDown,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const metadata = {
  title: 'À propos | RETEX360',
  description: 'Plateforme de Retours d\'Expérience pour les SDIS',
};

const features = [
  {
    icon: FileText,
    title: 'Gestion des RETEX',
    description: 'Créez, éditez et partagez vos retours d\'expérience avec un éditeur riche et des pièces jointes.',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  {
    icon: Search,
    title: 'Recherche avancée',
    description: 'Trouvez rapidement les RETEX pertinents grâce aux filtres par type, SDIS, sévérité et tags.',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
  {
    icon: CheckCircle,
    title: 'Workflow de validation',
    description: 'Processus de validation par les pairs pour garantir la qualité des retours partagés.',
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
  },
  {
    icon: Bell,
    title: 'Notifications temps réel',
    description: 'Restez informé des nouveaux RETEX, commentaires et validations instantanément.',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
  {
    icon: Brain,
    title: 'Intelligence Artificielle',
    description: 'Analyse automatique des RETEX pour identifier les patterns et générer des recommandations.',
    color: 'text-pink-500',
    bgColor: 'bg-pink-500/10',
  },
  {
    icon: Users,
    title: 'Collaboration inter-SDIS',
    description: 'Partagez les enseignements entre départements pour une amélioration continue nationale.',
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500/10',
  },
  {
    icon: BarChart3,
    title: 'Chiffres clés',
    description: 'Visualisez les données essentielles : SP engagés, durée, bilan humain, véhicules en infographie.',
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-500/10',
  },
  {
    icon: Clock,
    title: 'Timeline chronologique',
    description: 'Retracez le déroulement de l\'intervention avec des événements horodatés et colorés.',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
  },
  {
    icon: ClipboardCheck,
    title: 'Prescriptions',
    description: 'Plan d\'actions catégorisé avec suivi des responsables et échéances.',
    color: 'text-teal-500',
    bgColor: 'bg-teal-500/10',
  },
  {
    icon: FileDown,
    title: 'Export PDF professionnel',
    description: 'Générez des documents PDF avec infographies, timeline et mise en page DGSCGC.',
    color: 'text-rose-500',
    bgColor: 'bg-rose-500/10',
  },
];

const stats = [
  { label: 'SDIS connectés', value: '101', icon: Shield },
  { label: 'Types d\'intervention', value: '10', icon: Zap },
  { label: 'Rôles utilisateurs', value: '4', icon: Users },
];

const values = [
  {
    icon: Heart,
    title: 'Partage',
    description: 'Chaque expérience partagée peut sauver des vies lors d\'interventions futures.',
  },
  {
    icon: Lock,
    title: 'Sécurité',
    description: 'Données protégées avec authentification sécurisée et contrôle d\'accès par rôle.',
  },
  {
    icon: Globe,
    title: 'Accessibilité',
    description: 'Interface moderne accessible sur tous les appareils, en mode clair ou sombre.',
  },
  {
    icon: Sparkles,
    title: 'Innovation',
    description: 'Technologies de pointe pour faciliter l\'analyse et la recherche d\'informations.',
  },
];

export default function AboutPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-12">
      {/* Hero Section */}
      <section className="text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full">
          <Shield className="w-5 h-5 text-primary" />
          <span className="text-sm font-medium text-primary">Plateforme officielle</span>
        </div>
        
        <h1 className="text-4xl md:text-5xl font-bold">
          <span className="bg-gradient-to-r from-primary via-red-500 to-orange-500 bg-clip-text text-transparent">
            RETEX360
          </span>
        </h1>
        
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          La plateforme de <strong>Retours d&apos;Expérience</strong> conçue pour les 
          Services Départementaux d&apos;Incendie et de Secours (SDIS) de France.
        </p>

        <div className="flex flex-wrap justify-center gap-2">
          <Badge variant="outline" className="px-3 py-1">Next.js 16</Badge>
          <Badge variant="outline" className="px-3 py-1">React 19</Badge>
          <Badge variant="outline" className="px-3 py-1">Supabase</Badge>
          <Badge variant="outline" className="px-3 py-1">TailwindCSS</Badge>
          <Badge variant="outline" className="px-3 py-1">OpenAI</Badge>
        </div>
      </section>

      {/* Mission */}
      <section className="bg-card border border-border rounded-2xl p-8 md:p-10">
        <h2 className="text-2xl font-bold mb-4">Notre mission</h2>
        <p className="text-muted-foreground leading-relaxed text-lg">
          RETEX360 a pour objectif de <strong className="text-foreground">centraliser et valoriser les retours d&apos;expérience</strong> des 
          sapeurs-pompiers français. En facilitant le partage des enseignements tirés des interventions, 
          nous contribuons à l&apos;amélioration continue des pratiques opérationnelles et à la 
          <strong className="text-foreground"> sécurité des intervenants et des citoyens</strong>.
        </p>
        <p className="text-muted-foreground leading-relaxed text-lg mt-4">
          Chaque RETEX partagé est une opportunité d&apos;apprentissage pour l&apos;ensemble de la communauté. 
          Qu&apos;il s&apos;agisse d&apos;un incendie urbain, d&apos;une intervention NRBC, d&apos;un accident de la route 
          ou d&apos;un feu de forêt, les leçons apprises peuvent faire la différence lors des prochaines missions.
        </p>
        <div className="flex flex-wrap gap-3 mt-6">
          <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 px-4 py-2">
            Signalement
          </Badge>
          <span className="text-muted-foreground self-center">→</span>
          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 px-4 py-2">
            PEX (Partage d&apos;Expérience)
          </Badge>
          <span className="text-muted-foreground self-center">→</span>
          <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 px-4 py-2">
            RETEX complet
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-3">
          Workflow progressif conforme au mémento DGSCGC de septembre 2022
        </p>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="bg-card border-border">
            <CardContent className="p-6 text-center">
              <stat.icon className="w-8 h-8 text-primary mx-auto mb-3" />
              <p className="text-3xl font-bold text-foreground">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      {/* Features */}
      <section>
        <h2 className="text-2xl font-bold mb-6 text-center">Fonctionnalités principales</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature) => (
            <Card key={feature.title} className="bg-card border-border hover:border-primary/30 transition-colors">
              <CardContent className="p-6">
                <div className={`w-12 h-12 rounded-xl ${feature.bgColor} flex items-center justify-center mb-4`}>
                  <feature.icon className={`w-6 h-6 ${feature.color}`} />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Values */}
      <section className="bg-gradient-to-br from-primary/5 to-orange-500/5 border border-border rounded-2xl p-8 md:p-10">
        <h2 className="text-2xl font-bold mb-6 text-center">Nos valeurs</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {values.map((value) => (
            <div key={value.title} className="flex gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <value.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">{value.title}</h3>
                <p className="text-sm text-muted-foreground">{value.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Types d'intervention */}
      <section>
        <h2 className="text-2xl font-bold mb-6 text-center">Types d&apos;intervention couverts</h2>
        <div className="flex flex-wrap justify-center gap-3">
          {[
            'Incendie urbain',
            'Incendie industriel',
            'Feux de forêt (FDF)',
            'Secours à victimes (SAV)',
            'NRBC',
            'Accident de la route (AVP)',
            'Sauvetage déblaiement',
            'Secours en montagne',
            'Secours nautique',
            'Autres interventions',
          ].map((type) => (
            <Badge 
              key={type} 
              variant="secondary" 
              className="px-4 py-2 text-sm"
            >
              {type}
            </Badge>
          ))}
        </div>
      </section>

      {/* Footer */}
      <section className="text-center py-8 border-t border-border">
        {/*<p className="text-muted-foreground">
          Développé avec ❤️ pour les sapeurs-pompiers de France 🇫🇷
        </p>*/}
        <p className="text-sm text-muted-foreground mt-2">
          © {new Date().getFullYear()} RETEX360 - Tous droits réservés
        </p>
      </section>
    </div>
  );
}
