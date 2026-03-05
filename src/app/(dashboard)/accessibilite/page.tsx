import { Accessibility, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata = {
  title: 'Accessibilité | RETEX360',
  description: 'Déclaration d\'accessibilité de la plateforme RETEX360',
};

export default function AccessibilitePage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <Accessibility className="w-7 h-7 text-primary" />
          Déclaration d&apos;accessibilité
        </h1>
        <p className="text-muted-foreground mt-1">
          Conformément au décret n°2019-768 du 24 juillet 2019
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>État de conformité</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            La plateforme <strong className="text-foreground">RETEX360</strong> est en cours
            d&apos;amélioration pour atteindre la conformité au{' '}
            <strong className="text-foreground">RGAA 4.1</strong> (Référentiel Général
            d&apos;Amélioration de l&apos;Accessibilité).
          </p>
          <p>
            <strong className="text-foreground">Niveau visé :</strong> AA (conforme au WCAG 2.1 niveau AA)
          </p>
          <p>
            <strong className="text-foreground">État actuel :</strong> Partiellement conforme.
            Un audit complet est en cours pour identifier et corriger les non-conformités restantes.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mesures mises en place</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside">
            <li>Langue de la page déclarée (<code className="text-xs bg-muted px-1 py-0.5 rounded">lang=&quot;fr&quot;</code>)</li>
            <li>Lien d&apos;évitement &quot;Aller au contenu principal&quot;</li>
            <li>Labels associés aux champs de formulaire</li>
            <li>Composants accessibles (Radix UI) avec gestion du focus clavier</li>
            <li>Mode sombre / clair avec contraste adapté</li>
            <li>Attributs ARIA sur les éléments interactifs et les landmarks</li>
            <li>Textes alternatifs sur les images</li>
            <li>Structure sémantique HTML (header, nav, main, aside)</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contenus non accessibles</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside">
            <li>Certains graphiques du tableau de bord ne disposent pas encore de descriptions textuelles alternatives</li>
            <li>Certains indicateurs de statut reposent uniquement sur la couleur</li>
            <li>La hiérarchie des titres peut présenter des sauts sur certaines pages</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Technologies utilisées</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside">
            <li>HTML5</li>
            <li>CSS3 (Tailwind CSS)</li>
            <li>JavaScript / TypeScript (React, Next.js)</li>
            <li>WAI-ARIA 1.1</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Voie de recours</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Si vous constatez un défaut d&apos;accessibilité vous empêchant d&apos;accéder à un contenu
            ou une fonctionnalité, vous pouvez nous contacter pour obtenir une alternative accessible.
          </p>
          <p>
            Si vous n&apos;obtenez pas de réponse, vous pouvez adresser une réclamation au{' '}
            <a
              href="https://www.defenseurdesdroits.fr"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-1"
            >
              Défenseur des droits
              <ExternalLink className="w-3 h-3" />
            </a>
          </p>
          <p className="text-xs text-muted-foreground/60">
            Cette déclaration a été établie le 5 mars 2026.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
