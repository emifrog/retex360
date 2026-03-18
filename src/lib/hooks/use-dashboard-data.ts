'use client';

import { useEffect, useState } from 'react';
import { logger } from '@/lib/logger';

// In-memory cache shared across components within the same page render
const cache = new Map<string, { data: unknown; timestamp: number }>();
const pending = new Map<string, Promise<unknown>>();
const CACHE_TTL = 30_000; // 30 seconds

async function fetchWithCache<T>(url: string): Promise<T | null> {
  // Return cached data if fresh
  const cached = cache.get(url);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data as T;
  }

  // Deduplicate in-flight requests
  if (pending.has(url)) {
    return pending.get(url) as Promise<T | null>;
  }

  const promise = fetch(url)
    .then(async (res) => {
      if (!res.ok) return null;
      const data = await res.json();
      cache.set(url, { data, timestamp: Date.now() });
      return data as T;
    })
    .catch((error) => {
      logger.error(`Fetch error for ${url}:`, error);
      return null;
    })
    .finally(() => {
      pending.delete(url);
    });

  pending.set(url, promise);
  return promise;
}

// ---- Stats hook (shared between StatsCards and KpiCards) ----

export interface DashboardStats {
  totalRex: number;
  sdisCount: number;
  pendingValidation: number;
  validatedThisMonth: number;
  activeContributors: number;
  commentsThisWeek: number;
  favoritesThisWeek: number;
}

export function useDashboardStats() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchWithCache<DashboardStats>('/api/dashboard/stats')
      .then(setStats)
      .finally(() => setIsLoading(false));
  }, []);

  return { stats, isLoading };
}

// ---- Charts hook (shared between ChartsContainer and RexByTypeChartContainer) ----

export interface ChartsData {
  timeline: { month: string; rex: number; validated: number }[];
  byType: { name: string; value: number; color: string }[];
  bySeverity: { name: string; value: number; color: string }[];
}

export function useDashboardCharts() {
  const [data, setData] = useState<ChartsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchWithCache<ChartsData>('/api/dashboard/charts')
      .then(setData)
      .finally(() => setIsLoading(false));
  }, []);

  return { data, isLoading };
}
