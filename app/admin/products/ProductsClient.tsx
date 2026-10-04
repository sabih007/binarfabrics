"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ApiError, apiGet, apiSend } from "@/lib/client";
import { money } from "@/lib/products";
import type { ApiCategory } from "@/lib/serialize";
import ProductForm, { type AdminProduct } from "./ProductForm";

interface ListResponse {
  products: AdminProduct[];
  total: number;
  page: number;
  pages: number;
}

export default function ProductsClient({ categories }: { categories: ApiCategory[] }) {
  const params = useSearchParams();

  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [editing, setEditing] = useState<AdminProduct | null>(null);
  // `null` = closed, `undefined` = open on a blank "new product" form.
  const [formOpen, setFormOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams({ perPage: "100" });
      if (search.trim()) query.set("q", search.trim());
      if (categoryFilter) query.set("cat", categoryFilter);

      const data = await apiGet<ListResponse>(`/api/admin/products?${query}`);
      setProducts(data.products);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't load products.");
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter]);

  // Debounced so typing in the search box doesn't fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  // Deep link from the dashboard's "Add product" button.
  useEffect(() => {
    if (params.get("new")) {
      setEditing(null);
      setFormOpen(true);
    }
  }, [params]);

  async function remove(product: AdminProduct) {
    if (!confirm(`Delete "${product.name}"? This can't be undone.`)) return;

    setError(null);
    try {
      const res = await apiSend<{ deleted: boolean; archived: boolean; message?: string }>(
        `/api/admin/products/${product.dbId}`,
        "DELETE"
      );
      setNotice(res.message ?? `"${product.name}" was deleted.`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't delete that product.");
    }
  }

  async function toggleActive(product: AdminProduct) {
    setError(null);
    try {
      await apiSend(`/api/admin/products/${product.dbId}`, "PATCH", { active: !product.active });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't update that product.");
    }
  }

  function openNew() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(product: AdminProduct) {
    setEditing(product);
    setFormOpen(true);
  }

  return (
    <>
      <div className="adm__head">
        <div>
          <h1>Products</h1>
          <p>{products.length} shown · add, edit and manage stock.</p>
        </div>
        <div className="adm-actions">
          <button
            className="adm-btn adm-btn--primary"
            onClick={openNew}
            disabled={categories.length === 0}
          >
            Add product
          </button>
        </div>
      </div>

      {categories.length === 0 && (
        <div className="adm-note adm-note--info" style={{ marginBottom: 16 }}>
          You need at least one category before you can add a product.{" "}
          <a href="/admin/categories">Create one first →</a>
        </div>
      )}
      {error && <div className="adm-note adm-note--error" style={{ marginBottom: 16 }}>{error}</div>}
      {notice && (
        <div className="adm-note adm-note--ok" style={{ marginBottom: 16 }}>
          {notice}{" "}
          <button className="adm-btn adm-btn--sm" onClick={() => setNotice(null)}>
            Dismiss
          </button>
        </div>
      )}

      <div className="adm-toolbar">
        <input
          type="search"
          placeholder="Search products…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ minWidth: 220 }}
        />
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="adm-panel">
        {loading ? (
          <div className="adm-empty">Loading products…</div>
        ) : products.length === 0 ? (
          <div className="adm-empty">No products match. Try a different search.</div>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th className="num">Price</th>
                  <th className="num">Stock</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.dbId}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{p.name}</div>
                      <div className="adm-table__muted">
                        {p.slug} · {p.fabric} · {p.collection}
                      </div>
                      {p.colors.length > 0 && (
                        <div className="adm-swatches" style={{ marginTop: 5 }}>
                          {p.colors.map((c) => (
                            <i key={c} style={{ background: c }} title={c} />
                          ))}
                        </div>
                      )}
                    </td>
                    <td>{p.categoryName}</td>
                    <td className="num">
                      {money(p.price)}
                      {p.oldPrice ? (
                        <div className="adm-table__muted">
                          <del>{money(p.oldPrice)}</del>
                        </div>
                      ) : null}
                    </td>
                    <td className="num">
                      <span style={{ color: p.stock === 0 ? "#b91c1c" : p.stock <= p.lowStockAt ? "#92400e" : undefined }}>
                        {p.stock}
                      </span>
                    </td>
                    <td>
                      {p.active ? (
                        <span className="adm-pill adm-pill--CONFIRMED">Live</span>
                      ) : (
                        <span className="adm-pill adm-pill--draft">Hidden</span>
                      )}
                      {p.featured && (
                        <div className="adm-table__muted" style={{ marginTop: 4 }}>
                          Featured
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="adm-actions">
                        <button className="adm-btn adm-btn--sm" onClick={() => openEdit(p)}>
                          Edit
                        </button>
                        <button className="adm-btn adm-btn--sm" onClick={() => toggleActive(p)}>
                          {p.active ? "Hide" : "Publish"}
                        </button>
                        <button className="adm-btn adm-btn--sm adm-btn--danger" onClick={() => remove(p)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {formOpen && (
        <ProductForm
          product={editing}
          categories={categories}
          onClose={() => setFormOpen(false)}
          onSaved={async (message) => {
            setFormOpen(false);
            setNotice(message);
            await load();
          }}
        />
      )}
    </>
  );
}
