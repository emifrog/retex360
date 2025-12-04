import { RexForm } from '@/components/rex/rex-form';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NewRexPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/rex">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Nouveau RETEX</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Partagez votre retour d&apos;expérience avec la communauté
          </p>
        </div>
      </div>

      {/* Form */}
      <RexForm />
    </div>
  );
}
