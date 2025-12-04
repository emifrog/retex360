import { RexList } from '@/components/rex/rex-list';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import Link from 'next/link';

export default function RexListPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Retours d&apos;Expérience</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Explorez et partagez les enseignements opérationnels
          </p>
        </div>
        <Link href="/rex/new">
          <Button className="bg-gradient-to-r from-primary to-red-800 hover:from-primary/90 hover:to-red-800/90">
            <PlusCircle className="w-4 h-4 mr-2" />
            Nouveau REX
          </Button>
        </Link>
      </div>

      {/* Rex List */}
      <RexList />
    </div>
  );
}
