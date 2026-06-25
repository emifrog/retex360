import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ScrollText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export interface AuditRow {
  id: string;
  action: string;
  actor_email: string | null;
  target_label: string | null;
  created_at: string;
}

const ACTION_LABELS: Record<string, string> = {
  'sdis.onboard': 'Onboarding SDIS',
  'sdis.suspend': 'Suspension',
  'sdis.reactivate': 'Réactivation',
  'sdis.plan_change': 'Changement de plan',
  'sdis.subscription_update': 'Mise à jour abonnement',
  'sdis.reset_admin_password': 'Réinit. mot de passe admin',
};

/** Journal des dernières actions super_admin (présentationnel). */
export function AuditLogTable({ rows }: { rows: AuditRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ScrollText className="w-5 h-5 text-primary" />
          Journal d&apos;audit ({rows.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Aucune action enregistrée pour le moment.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead className="hidden sm:table-cell">Cible</TableHead>
                  <TableHead className="hidden md:table-cell">Auteur</TableHead>
                  <TableHead className="text-right">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      {ACTION_LABELS[r.action] ?? r.action}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">
                      {r.target_label ?? '—'}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {r.actor_email ?? '—'}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground whitespace-nowrap">
                      {format(new Date(r.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
