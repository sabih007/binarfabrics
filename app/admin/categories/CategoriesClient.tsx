"use client";

import { useState, type FormEvent } from "react";
import { ApiError, apiGet, apiSend } from "@/lib/client";
import { PATTERNS } from "@/lib/validation";
import type { ApiCategory } from "@/lib/serialize";
import Swatch from "@/components/Swatch";
import type { Pattern } from "@/lib/products";

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 64);

function parseColors(input: string): string[] {
  return input
    .split(/[,\s]+/)
    .map((c) => c.trim())
    .filter(Boolean)
    .map((c) => {
      const hex = c.startsWith("#") ? c : `#${c}`;
      return /^#[0-9a-fA-F]{3}$/.test(hex)
        ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
        : hex;
    });
}

export default function CategoriesClient({ initial }: { initial: ApiCategory[] }) {
  const [categories, setCategories] = useState(initial);
  const [editing, setEditing] = useState<ApiCategory | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function reload() {
    try {
      const data = await apiGet<{ categories: ApiCategory[] }>("/api/admin/categories");
      setCategories(data.categories);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't reload categories.");
    }
  }

  async function remove(category: ApiCategory) {
    if (!confirm(`Delete "${category.name}"?`)) return;
    setError(null);
    try {
      await apiSend(`/api/admin/categories/${category.id}`, "DELETE");
      setNotice(`"${category.name}" was deleted.`);
      await reload();
    } catch (err) {
      // The API refuses to delete a category that still has products and
      // explains why — surface that message verbatim.
      setError(err instanceof ApiError ? err.message : "Couldn't delete that category.");
    }
  }

  async function toggleActive(category: ApiCategory) {
    setError(null);
    try {
      await apiSend(`/api/admin/categories/${category.id}`, "PATCH", { active: !category.active });
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't update that category.");
    }
  }

  return (
    <>
      <div className="adm__head">
        <div>
          <h1>Categories</h1>
          <p>{categories.length} categories · these drive the shop filters and homepage tiles.</p>
        </div>
        <div className="adm-actions">
          <button
            className="adm-btn adm-btn--primary"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            Add category
          </button>
        </div>
      </div>

      {error && <div className="adm-note adm-note--error" style={{ marginBottom: 16 }}>{error}</div>}
      {notice && <div className="adm-note adm-note--ok" style={{ marginBottom: 16 }}>{notice}</div>}

      <div className="adm-panel">
        {categories.length === 0 ? (
          <div className="adm-empty">No categories yet. Add one to start building the catalogue.</div>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Artwork</th>
                  <th className="num">Products</th>
                  <th>Status</th>
                  <th className="num">Order</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {categories.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{c.name}</div>
                      <div className="adm-table__muted">
                        /{c.slug}
                        {c.sub ? ` · ${c.sub}` : ""}
                      </div>
                    </td>
                    <td>
                      <div style={{ width: 52 }}>
                        <Swatch pattern={c.pattern} colors={c.colors} image={c.image} alt="" />
                      </div>
                    </td>
                    <td className="num">{c.productCount ?? 0}</td>
                    <td>
                      {c.active ? (
                        <span className="adm-pill adm-pill--CONFIRMED">Live</span>
                      ) : (
                        <span className="adm-pill adm-pill--draft">Hidden</span>
                      )}
                      {c.showOnHome && (
                        <div className="adm-table__muted" style={{ marginTop: 4 }}>
                          On homepage
                        </div>
                      )}
                    </td>
                    <td className="num">{c.sortOrder}</td>
                    <td>
                      <div className="adm-actions">
                        <button
                          className="adm-btn adm-btn--sm"
                          onClick={() => {
                            setEditing(c);
                            setFormOpen(true);
                          }}
                        >
                          Edit
                        </button>
                        <button className="adm-btn adm-btn--sm" onClick={() => toggleActive(c)}>
                          {c.active ? "Hide" : "Publish"}
                        </button>
                        <button className="adm-btn adm-btn--sm adm-btn--danger" onClick={() => remove(c)}>
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
        <CategoryForm
          category={editing}
          onClose={() => setFormOpen(false)}
          onSaved={async (message) => {
            setFormOpen(false);
            setNotice(message);
            setError(null);
            await reload();
          }}
        />
      )}
    </>
  );
}

function CategoryForm({
  category,
  onClose,
  onSaved,
}: {
  category: ApiCategory | null;
  onClose: () => void;
  onSaved: (message: string) => void | Promise<void>;
}) {
  const isEdit = Boolean(category);

  const [name, setName] = useState(category?.name ?? "");
  const [slug, setSlug] = useState(category?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [pattern, setPattern] = useState<Pattern>(category?.pattern ?? "floral");
  const [colorsText, setColorsText] = useState((category?.colors ?? []).join(", "));
  const [image, setImage] = useState(category?.image ?? "");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  const colors = parseColors(colorsText);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setFields({});

    const form = new FormData(e.currentTarget);
    const payload = {
      slug: slug.trim(),
      name: name.trim(),
      sub: String(form.get("sub") ?? "").trim(),
      pattern,
      colors,
      image: image.trim(),
      href: String(form.get("href") ?? "").trim(),
      sortOrder: Number(form.get("sortOrder") ?? 0),
      active: form.get("active") === "on",
      showOnHome: form.get("showOnHome") === "on",
    };

    try {
      if (isEdit) {
        await apiSend(`/api/admin/categories/${category!.id}`, "PATCH", payload);
      } else {
        await apiSend("/api/admin/categories", "POST", payload);
      }
      await onSaved(isEdit ? `"${payload.name}" was updated.` : `"${payload.name}" was added.`);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (err.fields) setFields(err.fields);
      } else {
        setError("Couldn't save the category.");
      }
      setBusy(false);
    }
  }

  const fieldClass = (key: string) => `adm-field${fields[key] ? " adm-field--invalid" : ""}`;
  const FieldError = ({ name: key }: { name: string }) =>
    fields[key] ? <span className="adm-field__error">{fields[key]}</span> : null;

  return (
    <div className="adm-modal" role="dialog" aria-modal="true" aria-label={isEdit ? "Edit category" : "Add category"}>
      <div className="adm-modal__backdrop" onClick={busy ? undefined : onClose} />
      <div className="adm-modal__panel">
        <form onSubmit={onSubmit}>
          <div className="adm-modal__head">
            <h2>{isEdit ? "Edit category" : "Add category"}</h2>
            <button type="button" className="adm-btn adm-btn--sm" onClick={onClose} disabled={busy}>
              Close
            </button>
          </div>

          <div className="adm-modal__body adm-form">
            {error && <div className="adm-note adm-note--error">{error}</div>}

            <div className="adm-grid">
              <div className={fieldClass("name")}>
                <label htmlFor="c-name">Name</label>
                <input
                  id="c-name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!slugTouched) setSlug(slugify(e.target.value));
                  }}
                  type="text"
                  placeholder="Women"
                  required
                />
                <FieldError name="name" />
              </div>

              <div className={fieldClass("slug")}>
                <label htmlFor="c-slug">Slug</label>
                <input
                  id="c-slug"
                  value={slug}
                  onChange={(e) => {
                    setSlug(e.target.value);
                    setSlugTouched(true);
                  }}
                  type="text"
                  required
                />
                <span className="adm-field__hint">/shop?cat={slug || "…"}</span>
                <FieldError name="slug" />
              </div>
            </div>

            <div className="adm-grid">
              <div className={fieldClass("sub")}>
                <label htmlFor="c-sub">Subtitle</label>
                <input
                  id="c-sub"
                  name="sub"
                  type="text"
                  defaultValue={category?.sub ?? ""}
                  placeholder="Unstitched &amp; Pret"
                />
                <span className="adm-field__hint">Shown under the name on the homepage tile.</span>
              </div>

              <div className={fieldClass("sortOrder")}>
                <label htmlFor="c-sortOrder">Sort order</label>
                <input id="c-sortOrder" name="sortOrder" type="number" defaultValue={category?.sortOrder ?? 0} />
                <span className="adm-field__hint">Lower shows first.</span>
              </div>
            </div>

            <div className="adm-grid">
              <div className={fieldClass("image")}>
                <label htmlFor="c-image">Tile photo</label>
                <input
                  id="c-image"
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  type="text"
                  placeholder="/images/women.jpg"
                />
                <span className="adm-field__hint">Blank uses the generated pattern below.</span>
              </div>

              <div className={fieldClass("href")}>
                <label htmlFor="c-href">Custom link</label>
                <input id="c-href" name="href" type="text" defaultValue={category?.href ?? ""} placeholder={`/shop?cat=${slug || "slug"}`} />
                <span className="adm-field__hint">Leave blank for the default shop filter.</span>
              </div>
            </div>

            <div className="adm-grid">
              <div className="adm-field">
                <label htmlFor="c-pattern">Pattern</label>
                <select id="c-pattern" value={pattern} onChange={(e) => setPattern(e.target.value as Pattern)}>
                  {PATTERNS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div className={fieldClass("colors")}>
                <label htmlFor="c-colors">Colours</label>
                <input
                  id="c-colors"
                  value={colorsText}
                  onChange={(e) => setColorsText(e.target.value)}
                  type="text"
                  placeholder="#0f4c3a, #f2d7a6"
                />
                <div className="adm-swatches" style={{ marginTop: 4 }}>
                  {colors.map((c, i) => (
                    <i key={`${c}-${i}`} style={{ background: c }} title={c} />
                  ))}
                </div>
                <FieldError name="colors" />
              </div>

              <div className="adm-field">
                <label>Preview</label>
                <div style={{ width: 84 }}>
                  <Swatch pattern={pattern} colors={colors} image={image || undefined} alt="" />
                </div>
              </div>
            </div>

            <div className="adm-grid">
              <div className="adm-field adm-field--check">
                <input id="c-active" name="active" type="checkbox" defaultChecked={category?.active ?? true} />
                <label htmlFor="c-active">Visible in the shop</label>
              </div>

              <div className="adm-field adm-field--check">
                <input id="c-showOnHome" name="showOnHome" type="checkbox" defaultChecked={category?.showOnHome ?? true} />
                <label htmlFor="c-showOnHome">Show as a homepage tile</label>
              </div>
            </div>
          </div>

          <div className="adm-modal__foot">
            <button type="button" className="adm-btn" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="adm-btn adm-btn--primary" disabled={busy}>
              {busy ? "Saving…" : isEdit ? "Save changes" : "Add category"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
