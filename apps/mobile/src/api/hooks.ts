/* ==========================================================================
   React Query bindings.

   Keys are namespaced per resource so a mutation can invalidate exactly what
   it affected. Catalogue data is cached for a few minutes; stock-sensitive
   reads (a product page, a cart quote) are kept short-lived on purpose.
   ========================================================================== */

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import * as api from './endpoints';
import type { CartLine, CheckoutBody, ProductQuery } from './types';

export const keys = {
  products: (query: Partial<ProductQuery>, page: number) => ['products', query, page] as const,
  product: (slug: string) => ['product', slug] as const,
  categories: (homeOnly: boolean) => ['categories', homeOnly] as const,
  facets: ['facets'] as const,
  config: ['config'] as const,
  quote: (items: CartLine[]) => ['quote', items] as const,
  order: (number: string, phone: string) => ['order', number, phone] as const,
};

const MINUTE = 60_000;

export function useProducts(query: Partial<ProductQuery>, page = 1, perPage = 24) {
  return useQuery({
    queryKey: keys.products(query, page),
    queryFn: ({ signal }) => api.listProducts(query, page, perPage, { signal }),
    staleTime: 2 * MINUTE,
  });
}

/**
 * The shop list. Paged rather than fetched whole: a catalogue can run to
 * hundreds of designs, and `/api/products` caps a page at 100 anyway.
 */
export function useProductFeed(query: Partial<ProductQuery>, perPage = 24) {
  return useInfiniteQuery({
    queryKey: ['product-feed', query, perPage] as const,
    queryFn: ({ pageParam, signal }) =>
      api.listProducts(query, pageParam, perPage, { signal }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.pages ? last.page + 1 : undefined),
    staleTime: 2 * MINUTE,
  });
}

export function useProduct(slug: string) {
  return useQuery({
    queryKey: keys.product(slug),
    queryFn: ({ signal }) => api.getProduct(slug, signal),
    // Stock and the derived "few left" badge change under us, so re-check on
    // every visit rather than serving a cached page.
    staleTime: 0,
    enabled: Boolean(slug),
  });
}

export function useCategories(homeOnly = false) {
  return useQuery({
    queryKey: keys.categories(homeOnly),
    queryFn: ({ signal }) => api.listCategories({ homeOnly, signal }),
    staleTime: 10 * MINUTE,
  });
}

export function useFacets() {
  return useQuery({
    queryKey: keys.facets,
    queryFn: ({ signal }) => api.getFacets(signal),
    staleTime: 10 * MINUTE,
  });
}

/**
 * Optional store features. A missing `/api/config` (an older deployment of the
 * website) is not an error — the app falls back to cash on delivery only.
 */
export function useStoreConfig() {
  return useQuery({
    queryKey: keys.config,
    queryFn: ({ signal }) => api.getConfig(signal),
    staleTime: 30 * MINUTE,
    retry: 1,
  });
}

/** Server-side totals for the bag. The displayed total always comes from here. */
export function useQuote(items: CartLine[]) {
  return useQuery({
    queryKey: keys.quote(items),
    queryFn: ({ signal }) => api.quoteCart(items, signal),
    enabled: items.length > 0,
    staleTime: 30_000,
  });
}

/**
 * A one-shot order lookup for the tracking form. Modelled as a mutation rather
 * than a query because it is an action the customer takes, not state a screen
 * observes — which keeps the form free of "has it been submitted" bookkeeping.
 */
export function useOrderLookup() {
  return useMutation({
    mutationFn: ({ number, phone }: { number: string; phone: string }) =>
      api.trackOrder(number, phone),
    retry: false,
  });
}

export function useTrackOrder(number: string, phone: string, enabled: boolean) {
  return useQuery({
    queryKey: keys.order(number, phone),
    queryFn: ({ signal }) => api.trackOrder(number, phone, signal),
    enabled: enabled && number.length > 2 && phone.length > 3,
    // The number space is enumerable and the API throttles lookups; one
    // attempt is enough, and a 404 here means "no match", not "try again".
    retry: false,
  });
}

export function usePlaceOrder() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: CheckoutBody) => api.placeOrder(body),
    onSuccess: () => {
      // Stock moved, so every catalogue listing is now stale.
      client.invalidateQueries({ queryKey: ['products'] });
      client.invalidateQueries({ queryKey: ['product'] });
    },
  });
}

export function useSubscribe() {
  return useMutation({ mutationFn: (email: string) => api.subscribe(email) });
}
