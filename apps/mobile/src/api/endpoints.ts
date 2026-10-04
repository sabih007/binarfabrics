/* ==========================================================================
   One function per store endpoint. These are the same routes the website
   uses, so the app reads and writes the same Postgres database.
   ========================================================================== */

import { request } from './client';
import type {
  Category,
  CheckoutBody,
  CheckoutResult,
  Facets,
  Order,
  Product,
  ProductPage,
  ProductQuery,
  Quote,
  CartLine,
  StoreConfig,
} from './types';

/** Collapses the filter set into the query string `/api/products` expects. */
function productParams(query: Partial<ProductQuery>, page = 1, perPage = 24) {
  return {
    cat: query.cat,
    fabric: query.fabric,
    collection: query.collection,
    badge: query.badge,
    q: query.q,
    min: query.min,
    max: query.max,
    featured: query.featured,
    sort: query.sort ?? 'featured',
    page,
    perPage,
  };
}

export function listProducts(
  query: Partial<ProductQuery>,
  page = 1,
  perPage = 24,
  opts: { facets?: boolean; signal?: AbortSignal } = {}
) {
  return request<ProductPage>('/api/products', {
    params: { ...productParams(query, page, perPage), ...(opts.facets ? { facets: 1 } : {}) },
    signal: opts.signal,
  });
}

export function getProduct(slug: string, signal?: AbortSignal) {
  return request<{ product: Product; related: Product[] }>(
    `/api/products/${encodeURIComponent(slug)}`,
    { signal }
  );
}

export function listCategories(opts: { homeOnly?: boolean; signal?: AbortSignal } = {}) {
  return request<{ categories: Category[] }>('/api/categories', {
    params: opts.homeOnly ? { home: 1 } : undefined,
    signal: opts.signal,
  }).then((d) => d.categories);
}

/** Facets come bundled with a product page; this asks for just the filter lists. */
export function getFacets(signal?: AbortSignal) {
  return listProducts({}, 1, 1, { facets: true, signal }).then(
    (page) => page.facets ?? ({ fabrics: [], collections: [] } as Facets)
  );
}

export function getConfig(signal?: AbortSignal) {
  return request<StoreConfig>('/api/config', { signal });
}

/** Re-prices the bag server-side. Writes nothing; safe to call on every change. */
export function quoteCart(items: CartLine[], signal?: AbortSignal) {
  return request<Quote>('/api/orders', { method: 'POST', body: { items }, signal });
}

export function placeOrder(body: CheckoutBody) {
  return request<CheckoutResult>('/api/checkout', { method: 'POST', body });
}

export function trackOrder(number: string, phone: string, signal?: AbortSignal) {
  return request<{ order: Order }>(`/api/orders/${encodeURIComponent(number)}`, {
    params: { phone },
    signal,
  }).then((d) => d.order);
}

export function subscribe(email: string) {
  return request<{ subscribed: boolean }>('/api/newsletter', {
    method: 'POST',
    body: { email, source: 'app' },
  });
}

export function sendMessage(body: {
  name: string;
  phone: string;
  email?: string;
  topic: string;
  orderNumber?: string;
  message: string;
}) {
  return request<unknown>('/api/contact', { method: 'POST', body });
}
