'use client';

import { Card } from '@/components/ui/card';
import {
  Users,
  Clock,
  Heart,
  Truck,
  Building2,
  Droplets,
  Move,
  PersonStanding,
  Flame,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { KeyFigures as KeyFiguresType, BilanHumain } from '@/types';

interface KeyFiguresProps {
  data: KeyFiguresType;
  variant?: 'compact' | 'detailed';
  className?: string;
}

interface FigureCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number | undefined;
  subValue?: string;
  iconColor?: string;
  bgColor?: string;
}

function FigureCard({ icon: Icon, label, value, subValue, iconColor = 'text-primary', bgColor = 'bg-primary/10' }: FigureCardProps) {
  if (value === undefined || value === null || value === '') return null;

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border/50 hover:border-border transition-colors">
      <div className={cn('p-2 rounded-lg', bgColor)}>
        <Icon className={cn('w-5 h-5', iconColor)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        <p className="text-lg font-semibold text-foreground">{value}</p>
        {subValue && (
          <p className="text-xs text-muted-foreground">{subValue}</p>
        )}
      </div>
    </div>
  );
}

function formatBilanHumain(bilan: BilanHumain | undefined): string | undefined {
  if (!bilan) return undefined;
  
  const parts: string[] = [];
  
  if (bilan.victimes_decedees && bilan.victimes_decedees > 0) {
    parts.push(`${bilan.victimes_decedees} DCD`);
  }
  if (bilan.victimes_urgence_absolue && bilan.victimes_urgence_absolue > 0) {
    parts.push(`${bilan.victimes_urgence_absolue} UA`);
  }
  if (bilan.victimes_urgence_relative && bilan.victimes_urgence_relative > 0) {
    parts.push(`${bilan.victimes_urgence_relative} UR`);
  }
  if (bilan.impliques && bilan.impliques > 0) {
    parts.push(`${bilan.impliques} impl.`);
  }
  
  return parts.length > 0 ? parts.join(' / ') : undefined;
}

function getBilanTotal(bilan: BilanHumain | undefined): number {
  if (!bilan) return 0;
  return (bilan.victimes_decedees || 0) + 
         (bilan.victimes_urgence_absolue || 0) + 
         (bilan.victimes_urgence_relative || 0) + 
         (bilan.impliques || 0);
}

export function KeyFigures({ data, variant = 'compact', className }: KeyFiguresProps) {
  const hasData = data && (
    data.nb_sp_engages ||
    data.duree_intervention ||
    data.nb_vehicules ||
    data.bilan_humain ||
    data.sdis_impliques?.length ||
    data.surface_sinistree ||
    data.nb_personnes_evacuees ||
    data.nb_lances ||
    data.debit_eau
  );

  if (!hasData) return null;

  const bilanTotal = getBilanTotal(data.bilan_humain);
  const bilanDetail = formatBilanHumain(data.bilan_humain);

  if (variant === 'compact') {
    return (
      <div className={cn('grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3', className)}>
        <FigureCard
          icon={Users}
          label="SP engagés"
          value={data.nb_sp_engages}
          iconColor="text-blue-600"
          bgColor="bg-blue-500/10"
        />
        <FigureCard
          icon={Clock}
          label="Durée"
          value={data.duree_intervention}
          iconColor="text-amber-600"
          bgColor="bg-amber-500/10"
        />
        <FigureCard
          icon={Heart}
          label="Bilan humain"
          value={bilanTotal > 0 ? bilanTotal : undefined}
          subValue={bilanDetail}
          iconColor="text-red-600"
          bgColor="bg-red-500/10"
        />
        <FigureCard
          icon={Truck}
          label="Véhicules"
          value={data.nb_vehicules}
          iconColor="text-green-600"
          bgColor="bg-green-500/10"
        />
        <FigureCard
          icon={Building2}
          label="SDIS impliqués"
          value={data.sdis_impliques?.length ? data.sdis_impliques.length : undefined}
          subValue={data.sdis_impliques?.join(', ')}
          iconColor="text-purple-600"
          bgColor="bg-purple-500/10"
        />
      </div>
    );
  }

  return (
    <Card className={cn('p-4 bg-card/80 border-border/50', className)}>
      <h3 className="text-sm font-semibold text-muted-foreground mb-4 flex items-center gap-2">
        <Flame className="w-4 h-4 text-primary" />
        Chiffres clés de l&apos;intervention
      </h3>
      
      {/* Chiffres principaux */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-4">
        <FigureCard
          icon={Users}
          label="SP engagés"
          value={data.nb_sp_engages}
          iconColor="text-blue-600"
          bgColor="bg-blue-500/10"
        />
        <FigureCard
          icon={Clock}
          label="Durée"
          value={data.duree_intervention}
          iconColor="text-amber-600"
          bgColor="bg-amber-500/10"
        />
        <FigureCard
          icon={Heart}
          label="Bilan humain"
          value={bilanTotal > 0 ? bilanTotal : undefined}
          subValue={bilanDetail}
          iconColor="text-red-600"
          bgColor="bg-red-500/10"
        />
        <FigureCard
          icon={Truck}
          label="Véhicules"
          value={data.nb_vehicules}
          iconColor="text-green-600"
          bgColor="bg-green-500/10"
        />
        <FigureCard
          icon={Building2}
          label="SDIS impliqués"
          value={data.sdis_impliques?.length ? data.sdis_impliques.length : undefined}
          subValue={data.sdis_impliques?.join(', ')}
          iconColor="text-purple-600"
          bgColor="bg-purple-500/10"
        />
      </div>

      {/* Chiffres secondaires */}
      {(data.surface_sinistree || data.nb_personnes_evacuees || data.nb_lances || data.debit_eau) && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-border/50">
          <FigureCard
            icon={Move}
            label="Surface sinistrée"
            value={data.surface_sinistree}
            iconColor="text-orange-600"
            bgColor="bg-orange-500/10"
          />
          <FigureCard
            icon={PersonStanding}
            label="Personnes évacuées"
            value={data.nb_personnes_evacuees}
            iconColor="text-cyan-600"
            bgColor="bg-cyan-500/10"
          />
          <FigureCard
            icon={Flame}
            label="Lances en action"
            value={data.nb_lances}
            iconColor="text-red-600"
            bgColor="bg-red-500/10"
          />
          <FigureCard
            icon={Droplets}
            label="Débit d'eau"
            value={data.debit_eau}
            iconColor="text-blue-600"
            bgColor="bg-blue-500/10"
          />
        </div>
      )}
    </Card>
  );
}
