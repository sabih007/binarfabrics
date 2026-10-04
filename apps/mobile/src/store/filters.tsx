/* ==========================================================================
   Shop filter state.

   Lives above the route tree because the filter sheet is its own screen: the
   sheet edits the set, the shop list reads it. Deep links and category tiles
   seed it through `adopt()`.
   ========================================================================== */

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import type { ProductQuery } from '@/api/types';

export const EMPTY_QUERY: ProductQuery = { sort: 'featured' };

export const SORT_LABELS: Record<ProductQuery['sort'], string> = {
  featured: 'Featured',
  new: 'Newest',
  'price-asc': 'Price: low to high',
  'price-desc': 'Price: high to low',
  rating: 'Top rated',
};

export const BADGE_LABELS: Record<NonNullable<ProductQuery['badge']>, string> = {
  new: 'New in',
  sale: 'On sale',
  low: 'Few left',
};

interface FiltersValue {
  query: ProductQuery;
  /** How many narrowing filters are applied; sort order is not one of them. */
  activeCount: number;
  set: (patch: Partial<ProductQuery>) => void;
  /** Replaces the whole set — used when a deep link or category tile arrives. */
  adopt: (next: Partial<ProductQuery>) => void;
  reset: () => void;
}

const FiltersContext = createContext<FiltersValue | null>(null);

export function FiltersProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState<ProductQuery>(EMPTY_QUERY);

  const set = useCallback((patch: Partial<ProductQuery>) => {
    setQuery((current) => {
      const next: ProductQuery = { ...current, ...patch };
      // Clearing a filter drops the key entirely, so the query string stays
      // clean and two React Query keys never differ only by an undefined.
      for (const key of Object.keys(next) as (keyof ProductQuery)[]) {
        const value = next[key];
        if (value === undefined || value === null || value === '') delete next[key];
      }
      return { ...next, sort: next.sort ?? 'featured' };
    });
  }, []);

  const adopt = useCallback((next: Partial<ProductQuery>) => {
    setQuery({ ...EMPTY_QUERY, ...next, sort: next.sort ?? 'featured' });
  }, []);

  const reset = useCallback(() => setQuery(EMPTY_QUERY), []);

  const value = useMemo<FiltersValue>(() => {
    const { sort: _sort, ...narrowing } = query;
    return {
      query,
      activeCount: Object.values(narrowing).filter((v) => v !== undefined).length,
      set,
      adopt,
      reset,
    };
  }, [query, set, adopt, reset]);

  return <FiltersContext.Provider value={value}>{children}</FiltersContext.Provider>;
}

export function useFilters(): FiltersValue {
  const value = useContext(FiltersContext);
  if (!value) throw new Error('useFilters must be used inside <FiltersProvider>.');
  return value;
}
