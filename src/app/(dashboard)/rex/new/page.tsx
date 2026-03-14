import type { Metadata } from 'next';
import { RexForm } from '@/components/rex/rex-form';

export const metadata: Metadata = {
  title: 'Nouveau RETEX',
  description: 'Créez un nouveau retour d\'expérience pour partager les enseignements de votre intervention.',
};
import { Breadcrumb } from '@/components/ui/breadcrumb';

export default function NewRexPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb items={[
        { label: 'REX', href: '/rex' },
        { label: 'Nouveau RETEX' },
      ]} />

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Nouveau RETEX</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Partagez votre retour d&apos;expérience avec la communauté
        </p>
      </div>

      {/* Form */}
      <RexForm />
    </div>
  );
}
