'use client';

import { Card } from '@/components/ui/card';
import {
  Bell,
  MapPin,
  Zap,
  Radio,
  CheckCircle,
  Circle,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TimelineEvent, TimelineEventType } from '@/types';
import { TIMELINE_EVENT_CONFIG } from '@/types';

interface InterventionTimelineProps {
  events: TimelineEvent[];
  variant?: 'horizontal' | 'vertical';
  className?: string;
}

const iconMap = {
  Bell,
  MapPin,
  Zap,
  Radio,
  CheckCircle,
  Circle,
};

function getIcon(type: TimelineEventType) {
  const config = TIMELINE_EVENT_CONFIG[type];
  const IconComponent = iconMap[config.icon as keyof typeof iconMap] || Circle;
  return IconComponent;
}

export function InterventionTimeline({ events, variant = 'vertical', className }: InterventionTimelineProps) {
  if (!events || events.length === 0) return null;

  const sortedEvents = [...events].sort((a, b) => {
    if (a.heure < b.heure) return -1;
    if (a.heure > b.heure) return 1;
    return 0;
  });

  if (variant === 'horizontal') {
    return (
      <Card className={cn('p-4 bg-card/80 border-border/50 overflow-x-auto', className)}>
        <h3 className="text-sm font-semibold text-muted-foreground mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          Chronologie de l&apos;intervention
        </h3>
        <div className="flex items-start gap-2 min-w-max pb-2">
          {sortedEvents.map((event, index) => {
            const config = TIMELINE_EVENT_CONFIG[event.type];
            const Icon = getIcon(event.type);
            const isLast = index === sortedEvents.length - 1;

            return (
              <div key={event.id} className="flex items-start">
                <div className="flex flex-col items-center min-w-[120px]">
                  <div className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center',
                    config.bgColor
                  )}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="mt-2 text-center">
                    <p className="text-xs font-semibold text-foreground">{event.heure}</p>
                    <p className="text-sm font-medium text-foreground mt-1">{event.titre}</p>
                    {event.description && (
                      <p className="text-xs text-muted-foreground mt-1 max-w-[100px] line-clamp-2">
                        {event.description}
                      </p>
                    )}
                  </div>
                </div>
                {!isLast && (
                  <div className="flex-shrink-0 w-8 h-0.5 bg-border mt-5 mx-1" />
                )}
              </div>
            );
          })}
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn('p-4 bg-card/80 border-border/50', className)}>
      <h3 className="text-sm font-semibold text-muted-foreground mb-4 flex items-center gap-2">
        <Clock className="w-4 h-4 text-primary" />
        Chronologie de l&apos;intervention
      </h3>
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-border" />

        <div className="space-y-4">
          {sortedEvents.map((event, index) => {
            const config = TIMELINE_EVENT_CONFIG[event.type];
            const Icon = getIcon(event.type);
            const isLast = index === sortedEvents.length - 1;

            return (
              <div key={event.id} className="relative flex items-start gap-4">
                {/* Icon */}
                <div className={cn(
                  'relative z-10 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
                  config.bgColor
                )}>
                  <Icon className="w-5 h-5 text-white" />
                </div>

                {/* Content */}
                <div className={cn(
                  'flex-1 pb-4',
                  isLast && 'pb-0'
                )}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded">
                      {event.heure}
                    </span>
                    <span className={cn('text-xs', config.color)}>
                      {config.label}
                    </span>
                  </div>
                  <p className="font-medium text-foreground">{event.titre}</p>
                  {event.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {event.description}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
