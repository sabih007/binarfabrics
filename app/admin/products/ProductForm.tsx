"use client";

import { useState, type FormEvent } from "react";
import { ApiError, apiSend } from "@/lib/client";
import { PATTERNS } from "@/lib/validation";
import type { ApiCategory } from "@/lib/serialize";
import Swatch from "@/components/Swatch";
import type { Pattern } from "@/lib/products";

export interface AdminProduct {
  dbId: string;
  slug: string;
  name: string;
  categoryId: string;
  categoryName: string;
  collection: string;
  fabric: string;
  price: number;
  oldPrice: number | null;
  pieces: number;
  pattern: Pattern;
  colors: string[];
  sizes: string[];
  rawBadge: string | null;
  rating: number;
  reviews: number;
  description: string;
  image?: string;
  images: string[];
  stock: number;
  lowStockAt: number;
  active: boolean;
  featured: boolean;
  sortOrder: number;
}

interface Props {
  product: AdminProduct | null;
  categories: ApiCategory[];
  onClose: () => void;
  onSaved: (message: string) => void | Promise<void>;
}

/** "#0f4c3a, #fff" -> ["#0f4c3a", "#ffffff"] — forgiving about spacing and shorthand. */
function parseColors(input: string): string[] {
  return input
    .split(/[,\s]+/)
    .map((c) => c.trim())
    .filter(Boolean)
    .map((c) => {
      const hex = c.startsWith("#") ? c : `#${c}`;
      // Expand #abc to #aabbcc so it passes the API's 6-digit check.
      return /^#[0-9a-fA-F]{3}$/.test(hex)
        ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
        : hex;
    });
}

const parseList = (input: string) =>
  input
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

/** "Gulnar Printed Lawn" -> "gulnar-printed-lawn" */
const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 64);

export default function ProductForm({ product, categories, onClose, onSaved }: Props) {
  const isEdit = Boolean(product);

  const [slug, setSlug] = useState(product?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [name, setName] = useState(product?.name ?? "");
  const [pattern, setPattern] = useState<Pattern>(product?.pattern ?? "floral");
  const [colorsText, setColorsText] = useState((product?.colors ?? []).join(", "));
  const [image, setImage] = useState(product?.image ?? "");

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
    const num = (key: string) => Number(form.get(key) ?? 0);
    const oldPrice = num("oldPrice");

    const payload = {
      slug: slug.trim(),
      name: name.trim(),
      categoryId: String(form.get("categoryId") ?? ""),
      collection: String(form.get("collection") ?? "").trim(),
      fabric: String(form.get("fabric") ?? "").trim(),
      price: num("price"),
      // Empty or zero means "not on sale", which the API expects as null.
      oldPrice: oldPrice > 0 ? oldPrice : null,
      pieces: num("pieces"),
      pattern,
      colors,
      sizes: parseList(String(form.get("sizes") ?? "")),
      badge: (String(form.get("badge") ?? "") || null) as "new" | "sale" | "low" | null,
      rating: num("rating"),
      reviews: num("reviews"),
      description: String(form.get("description") ?? "").trim(),
      image: image.trim(),
      stock: num("stock"),
      lowStockAt: num("lowStockAt"),
      active: form.get("active") === "on",
      featured: form.get("featured") === "on",
      sortOrder: num("sortOrder"),
    };

    try {
      if (isEdit) {
        await apiSend(`/api/admin/products/${product!.dbId}`, "PATCH", payload);
      } else {
        await apiSend("/api/admin/products", "POST", payload);
      }
      await onSaved(isEdit ? `"${payload.name}" was updated.` : `"${payload.name}" was added.`);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (err.fields) setFields(err.fields);
      } else {
        setError("Couldn't save the product.");
      }
      setBusy(false);
    }
  }

  const fieldClass = (key: string) => `adm-field${fields[key] ? " adm-field--invalid" : ""}`;
  const FieldError = ({ name: key }: { name: string }) =>
    fields[key] ? <span className="adm-field__error">{fields[key]}</span> : null;

  return (
    <div className="adm-modal" role="dialog" aria-modal="true" aria-label={isEdit ? "Edit product" : "Add product"}>
      <div className="adm-modal__backdrop" onClick={busy ? undefined : onClose} />
      <div className="adm-modal__panel">
        <form onSubmit={onSubmit}>
          <div className="adm-modal__head">
            <h2>{isEdit ? "Edit product" : "Add product"}</h2>
            <button type="button" className="adm-btn adm-btn--sm" onClick={onClose} disabled={busy}>
              Close
            </button>
          </div>

          <div className="adm-modal__body adm-form">
            {error && <div className="adm-note adm-note--error">{error}</div>}

            <div className="adm-grid">
              <div className={fieldClass("name")}>
                <label htmlFor="p-name">Product name</label>
                <input
                  id="p-name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    // Keep the slug in step until the user edits it themselves.
                    if (!slugTouched) setSlug(slugify(e.target.value));
                  }}
                  type="text"
                  required
                />
                <FieldError name="name" />
              </div>

              <div className={fieldClass("slug")}>
                <label htmlFor="p-slug">URL slug</label>
                <input
                  id="p-slug"
                  value={slug}
                  onChange={(e) => {
                    setSlug(e.target.value);
                    setSlugTouched(true);
                  }}
                  type="text"
                  required
                />
                <span className="adm-field__hint">/product/{slug || "…"}</span>
                <FieldError name="slug" />
              </div>
            </div>

            <div className="adm-grid">
              <div className={fieldClass("categoryId")}>
                <label htmlFor="p-cat">Category</label>
                <select id="p-cat" name="categoryId" defaultValue={product?.categoryId ?? categories[0]?.id} required>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <FieldError name="categoryId" />
              </div>

              <div className={fieldClass("collection")}>
                <label htmlFor="p-collection">Collection</label>
                <input
                  id="p-collection"
                  name="collection"
                  type="text"
                  defaultValue={product?.collection ?? ""}
                  placeholder="Summer Lawn '26"
                  required
                />
                <FieldError name="collection" />
              </div>

              <div className={fieldClass("fabric")}>
                <label htmlFor="p-fabric">Fabric</label>
                <input
                  id="p-fabric"
                  name="fabric"
                  type="text"
                  defaultValue={product?.fabric ?? ""}
                  placeholder="Lawn"
                  required
                />
                <FieldError name="fabric" />
              </div>
            </div>

            <div className="adm-grid">
              <div className={fieldClass("price")}>
                <label htmlFor="p-price">Price (PKR)</label>
                <input id="p-price" name="price" type="number" min={1} defaultValue={product?.price ?? ""} required />
                <FieldError name="price" />
              </div>

              <div className={fieldClass("oldPrice")}>
                <label htmlFor="p-oldPrice">Was (PKR)</label>
                <input id="p-oldPrice" name="oldPrice" type="number" min={0} defaultValue={product?.oldPrice ?? ""} />
                <span className="adm-field__hint">Leave blank if not on sale.</span>
                <FieldError name="oldPrice" />
              </div>

              <div className={fieldClass("pieces")}>
                <label htmlFor="p-pieces">Pieces</label>
                <input id="p-pieces" name="pieces" type="number" min={1} defaultValue={product?.pieces ?? 1} />
                <FieldError name="pieces" />
              </div>
            </div>

            <div className="adm-grid">
              <div className={fieldClass("stock")}>
                <label htmlFor="p-stock">Stock on hand</label>
                <input id="p-stock" name="stock" type="number" min={0} defaultValue={product?.stock ?? 0} />
                <FieldError name="stock" />
              </div>

              <div className={fieldClass("lowStockAt")}>
                <label htmlFor="p-lowStockAt">&quot;Few left&quot; at</label>
                <input id="p-lowStockAt" name="lowStockAt" type="number" min={0} defaultValue={product?.lowStockAt ?? 5} />
                <span className="adm-field__hint">Shows the badge at or below this.</span>
              </div>

              <div className={fieldClass("badge")}>
                <label htmlFor="p-badge">Badge</label>
                <select id="p-badge" name="badge" defaultValue={product?.rawBadge ?? ""}>
                  <option value="">None</option>
                  <option value="new">New</option>
                  <option value="sale">Sale</option>
                  <option value="low">Few left</option>
                </select>
                <span className="adm-field__hint">Low stock overrides this automatically.</span>
              </div>
            </div>

            <div className={fieldClass("description")}>
              <label htmlFor="p-description">Description</label>
              <textarea
                id="p-description"
                name="description"
                defaultValue={product?.description ?? ""}
                placeholder="Breathable premium lawn with a hand-drawn floral print…"
                required
              />
              <FieldError name="description" />
            </div>

            <div className="adm-grid">
              <div className={fieldClass("image")}>
                <label htmlFor="p-image">Photo path</label>
                <input
                  id="p-image"
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  type="text"
                  placeholder="/images/bl-101.jpg"
                />
                <span className="adm-field__hint">
                  Put the file in <code>public/images/</code>. Blank uses generated artwork.
                </span>
                <FieldError name="image" />
              </div>

              <div className={fieldClass("sizes")}>
                <label htmlFor="p-sizes">Sizes</label>
                <input
                  id="p-sizes"
                  name="sizes"
                  type="text"
                  defaultValue={(product?.sizes ?? []).join(", ")}
                  placeholder="S, M, L"
                />
                <span className="adm-field__hint">Comma separated. Blank for unstitched fabric.</span>
              </div>
            </div>

            <div className="adm-grid">
              <div className={fieldClass("pattern")}>
                <label htmlFor="p-pattern">Generated pattern</label>
                <select id="p-pattern" value={pattern} onChange={(e) => setPattern(e.target.value as Pattern)}>
                  {PATTERNS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div className={fieldClass("colors")}>
                <label htmlFor="p-colors">Colours</label>
                <input
                  id="p-colors"
                  value={colorsText}
                  onChange={(e) => setColorsText(e.target.value)}
                  type="text"
                  placeholder="#0f4c3a, #f2d7a6, #e8a3a8"
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
                <div style={{ width: 96 }}>
                  <Swatch pattern={pattern} colors={colors} image={image || undefined} alt="" />
                </div>
              </div>
            </div>

            <div className="adm-grid">
              <div className={fieldClass("rating")}>
                <label htmlFor="p-rating">Rating</label>
                <input id="p-rating" name="rating" type="number" min={0} max={5} step={0.1} defaultValue={product?.rating ?? 0} />
                <FieldError name="rating" />
              </div>

              <div className={fieldClass("reviews")}>
                <label htmlFor="p-reviews">Review count</label>
                <input id="p-reviews" name="reviews" type="number" min={0} defaultValue={product?.reviews ?? 0} />
              </div>

              <div className={fieldClass("sortOrder")}>
                <label htmlFor="p-sortOrder">Sort order</label>
                <input id="p-sortOrder" name="sortOrder" type="number" defaultValue={product?.sortOrder ?? 0} />
                <span className="adm-field__hint">Lower shows first.</span>
              </div>
            </div>

            <div className="adm-grid">
              <div className="adm-field adm-field--check">
                <input id="p-active" name="active" type="checkbox" defaultChecked={product?.active ?? true} />
                <label htmlFor="p-active">Visible in the shop</label>
              </div>

              <div className="adm-field adm-field--check">
                <input id="p-featured" name="featured" type="checkbox" defaultChecked={product?.featured ?? false} />
                <label htmlFor="p-featured">Feature on the homepage</label>
              </div>
            </div>
          </div>

          <div className="adm-modal__foot">
            <button type="button" className="adm-btn" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="adm-btn adm-btn--primary" disabled={busy}>
              {busy ? "Saving…" : isEdit ? "Save changes" : "Add product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
