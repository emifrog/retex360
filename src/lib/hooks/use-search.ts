'use client';

import { useState, useCallback } from 'react';
import { useDebounce } from './use-debounce';

interface SearchResult {
  id: string;
  title: string;
  description: string | null;
  type: string;
  severity: string;
  intervention_date: string;
  author: {
    full_name: string;
    avatar_url: string | null;
  };
  sdis: {
    code: string;
    name: string;
  };
}

interface SearchResponse {
  results: SearchResult[];
  searchType: 'semantic' | 'text';
  scores?: { id: string; similarity: number }[];
}

export function useSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchType, setSearchType] = useState<'semantic' | 'text' | null>(null);

  const debouncedQuery = useDebounce(query, 300);

  const search = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setSearchType(null);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery, limit: 20 }),
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data: SearchResponse = await response.json();
      setResults(data.results);
      setSearchType(data.searchType);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    query,
    setQuery,
    debouncedQuery,
    results,
    isLoading,
    searchType,
    search,
  };
}
