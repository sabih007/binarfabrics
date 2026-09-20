/* ==========================================================================
   BinAr Fabrics — Main script
   - Injects shared header / footer / drawers on every page
   - Cart + wishlist (persisted in localStorage)
   - Search overlay, mobile nav, toasts, scroll reveal
   - Page renderers: home, shop, product
   ========================================================================== */

(function () {
  "use strict";

  const PRODUCTS = window.BINAR_PRODUCTS || [];
  const CATEGORIES = window.BINAR_CATEGORIES || [];
  const FREE_SHIPPING_AT = 3000;
  const SHIPPING_FEE = 250;

  /* ---------- Helpers ---------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const money = (n) => "PKR " + Number(n).toLocaleString("en-PK");
  const byId = (id) => PRODUCTS.find((p) => p.id === id);
  const catName = (slug) => ({ women: "Women", men: "Men", kids: "Kids", home: "Home" }[slug] || slug);
  const store = {
    get(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } },
    set(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }
  };

  const ICONS = {
    search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    user: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/></svg>',
    heart: '<svg viewBox="0 0 24 24"><path d="M12 21s-7.5-4.6-9.5-9.3C1.1 8.3 3.3 4.5 7 4.5c2 0 3.5 1.1 5 2.8 1.5-1.7 3-2.8 5-2.8 3.7 0 5.9 3.8 4.5 7.2C19.5 16.4 12 21 12 21z"/></svg>',
    bag: '<svg viewBox="0 0 24 24"><path d="M6 8h12l1 13H5L6 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>',
    menu: '<svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    check: '<svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></svg>'
  };

  /* ---------- Swatch markup (placeholder product imagery) ---------- */
  function swatch(p, label) {
    const [c1, c2, c3] = p.colors || ["#d9cfc0"];
    const style = `--c1:${c1};--c2:${c2 || "#fff"};--c3:${c3 || c2 || "#fff"}`;
    return `<div class="swatch swatch--${p.pattern || "plain"}" style="${style}"><span class="swatch__weave"></span>${label ? `<span class="swatch__label">${label}</span>` : ""}</div>`;
  }
  window.binarSwatch = swatch;

  /* ---------- Shared layout ---------- */
  function renderHeader() {
    const page = document.body.dataset.page || "";
    const active = (slug) => (page === slug ? " is-active" : "");
    return `
    <div class="announcement">Free delivery on orders above <strong>PKR 3,000</strong> &nbsp;·&nbsp; Cash on delivery nationwide &nbsp;·&nbsp; Easy 7-day exchange</div>
    <header class="header">
      <div class="container header__inner">
        <div class="header__left">
          <button class="icon-btn menu-toggle" id="menuToggle" aria-label="Open menu">${ICONS.menu}</button>
          <ul class="nav">
            <li><a class="nav__link${active("women")}" href="shop.html?cat=women">Women</a>
              <div class="mega">
                <div><h4>Unstitched</h4><ul>
                  <li><a href="shop.html?cat=women&fabric=Lawn">Lawn</a></li>
                  <li><a href="shop.html?cat=women&fabric=Cotton">Cotton</a></li>
                  <li><a href="shop.html?cat=women&fabric=Linen">Linen</a></li>
                  <li><a href="shop.html?cat=women&fabric=Chiffon">Chiffon</a></li>
                  <li><a href="shop.html?cat=women&fabric=Silk">Silk</a></li>
                  <li><a href="shop.html?cat=women&fabric=Khaddar">Khaddar</a></li></ul></div>
                <div><h4>Collections</h4><ul>
                  <li><a href="shop.html?collection=Summer Lawn '26">Summer Lawn '26</a></li>
                  <li><a href="shop.html?collection=Festive Edit">Festive Edit</a></li>
                  <li><a href="shop.html?collection=Winter Weaves">Winter Weaves</a></li>
                  <li><a href="shop.html?badge=new">New Arrivals</a></li>
                  <li><a href="shop.html?badge=sale">On Sale</a></li></ul></div>
                <a class="mega__promo" href="shop.html?collection=Summer Lawn '26"><strong>Summer Lawn '26</strong><span>Fresh prints, from PKR 2,990</span></a>
              </div></li>
            <li><a class="nav__link${active("men")}" href="shop.html?cat=men">Men</a>
              <div class="mega">
                <div><h4>Fabric</h4><ul>
                  <li><a href="shop.html?cat=men&fabric=Wash %26 Wear">Wash &amp; Wear</a></li>
                  <li><a href="shop.html?cat=men&fabric=Cotton">Cotton</a></li>
                  <li><a href="shop.html?cat=men&fabric=Karandi">Karandi</a></li>
                  <li><a href="shop.html?cat=men&fabric=Silk">Boski &amp; Silk</a></li></ul></div>
                <div><h4>Occasion</h4><ul>
                  <li><a href="shop.html?cat=men&collection=Men's Essentials">Everyday</a></li>
                  <li><a href="shop.html?cat=men&collection=Festive Edit">Eid &amp; Wedding</a></li>
                  <li><a href="shop.html?cat=men&collection=Winter Weaves">Winter</a></li></ul></div>
                <a class="mega__promo" href="shop.html?cat=men"><strong>Men's Essentials</strong><span>Wash &amp; wear from PKR 3,490</span></a>
              </div></li>
            <li><a class="nav__link" href="shop.html?cat=kids">Kids</a></li>
            <li><a class="nav__link" href="shop.html?cat=home">Home</a></li>
            <li><a class="nav__link nav__link--sale" href="shop.html?badge=sale">Sale</a></li>
          </ul>
        </div>
        <a class="logo" href="index.html" aria-label="BinAr Fabrics home"><span class="logo__name">Bin<span>Ar</span></span><span class="logo__tag">Fabrics</span></a>
        <div class="header__actions">
          <button class="icon-btn" id="searchOpen" aria-label="Search">${ICONS.search}</button>
          <a class="icon-btn" href="contact.html" aria-label="Account">${ICONS.user}</a>
          <a class="icon-btn" href="shop.html?wishlist=1" aria-label="Wishlist">${ICONS.heart}<span class="icon-btn__count" id="wishCount"></span></a>
          <button class="icon-btn" id="cartOpen" aria-label="Open cart">${ICONS.bag}<span class="icon-btn__count" id="cartCount"></span></button>
        </div>
      </div>
    </header>

    <div class="mobile-nav" id="mobileNav">
      <div class="mobile-nav__backdrop" data-close-mobile></div>
      <nav class="mobile-nav__panel">
        <div class="mobile-nav__head"><span class="logo__name">Bin<span style="color:var(--green)">Ar</span></span><button class="icon-btn" data-close-mobile aria-label="Close menu">${ICONS.close}</button></div>
        <ul class="mobile-nav__list">
          <li><details><summary>Women</summary><div class="mobile-nav__sub">
            <a href="shop.html?cat=women">All Women</a><a href="shop.html?cat=women&fabric=Lawn">Lawn</a><a href="shop.html?cat=women&fabric=Cotton">Cotton</a><a href="shop.html?cat=women&fabric=Linen">Linen</a><a href="shop.html?cat=women&fabric=Chiffon">Chiffon</a><a href="shop.html?cat=women&fabric=Silk">Silk</a><a href="shop.html?cat=women&fabric=Khaddar">Khaddar</a></div></details></li>
          <li><details><summary>Men</summary><div class="mobile-nav__sub">
            <a href="shop.html?cat=men">All Men</a><a href="shop.html?cat=men&fabric=Wash %26 Wear">Wash &amp; Wear</a><a href="shop.html?cat=men&fabric=Cotton">Cotton</a><a href="shop.html?cat=men&fabric=Karandi">Karandi</a><a href="shop.html?cat=men&fabric=Silk">Boski &amp; Silk</a></div></details></li>
          <li><a href="shop.html?cat=kids">Kids</a></li>
          <li><a href="shop.html?cat=home">Home</a></li>
          <li><a href="shop.html?badge=new">New Arrivals</a></li>
          <li><a href="shop.html?badge=sale" style="color:var(--sale)">Sale</a></li>
          <li><a href="about.html">About Us</a></li>
          <li><a href="contact.html">Contact</a></li>
        </ul>
        <div class="mobile-nav__foot"><span>Helpline: 0300-1234567</span><span>Mon–Sat, 10am–7pm</span></div>
      </nav>
    </div>

    <div class="search" id="search">
      <div class="search__inner">
        <div class="search__row">${ICONS.search}<input class="search__input" id="searchInput" type="search" placeholder="Search lawn, chiffon, men's fabric…" autocomplete="off"><button class="icon-btn" id="searchClose" aria-label="Close search">${ICONS.close}</button></div>
        <div class="search__hint">Popular: <button data-q="lawn">Lawn</button><button data-q="chiffon">Chiffon</button><button data-q="men">Men's</button><button data-q="embroidered">Embroidered</button><button data-q="winter">Winter</button></div>
        <div id="searchResults"></div>
      </div>
    </div>

    <div class="cart-drawer" id="cartDrawer">
      <div class="cart-drawer__backdrop" data-close-cart></div>
      <aside class="cart-drawer__panel" aria-label="Shopping bag">
        <div class="cart-drawer__head"><h3>Your Bag <span id="cartHeadCount" style="color:var(--ink-3);font-size:14px;font-family:var(--sans)"></span></h3><button class="icon-btn" data-close-cart aria-label="Close cart">${ICONS.close}</button></div>
        <div class="cart-drawer__body" id="cartBody"></div>
        <div class="cart-drawer__foot" id="cartFoot"></div>
      </aside>
    </div>
    <div class="toast" id="toast"></div>`;
  }

  function renderFooter() {
    return `
    <section class="newsletter">
      <div class="container newsletter__inner">
        <div><span class="eyebrow">Stay in the loop</span><h2>Get first access to new collections</h2><p>Sign up for launches, restocks and members-only discounts. No spam, ever.</p></div>
        <form class="newsletter__form" id="newsletterForm"><input type="email" placeholder="Your email address" required aria-label="Email"><button class="btn" type="submit">Subscribe</button></form>
      </div>
    </section>
    <footer class="footer">
      <div class="container">
        <div class="footer__grid">
          <div class="footer__brand">
            <a class="logo" href="index.html" style="align-items:flex-start"><span class="logo__name">Bin<span>Ar</span></span><span class="logo__tag">Fabrics</span></a>
            <p>Premium unstitched fabrics and ready-to-wear from Pakistan — crafted for comfort, colour and everyday elegance.</p>
            <div class="social">
              <a href="#" aria-label="Instagram"><svg viewBox="0 0 24 24"><path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7zm5 3.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9zm0 2a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM17.5 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/></svg></a>
              <a href="#" aria-label="Facebook"><svg viewBox="0 0 24 24"><path d="M13.5 22v-8h2.7l.4-3.2h-3.1V8.8c0-.9.3-1.6 1.6-1.6h1.7V4.4c-.3 0-1.3-.1-2.5-.1-2.5 0-4.1 1.5-4.1 4.2v2.3H7.4V14h2.8v8h3.3z"/></svg></a>
              <a href="#" aria-label="TikTok"><svg viewBox="0 0 24 24"><path d="M16 3c.3 2.3 1.7 3.8 4 4v3c-1.5 0-2.9-.5-4-1.3v6.1A5.8 5.8 0 1 1 10.2 9v3.1a2.8 2.8 0 1 0 2.8 2.8V3h3z"/></svg></a>
              <a href="#" aria-label="WhatsApp"><svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5.1-1.3A10 10 0 1 0 12 2zm0 2a8 8 0 1 1-4.2 14.8l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 0 1 12 4zm-3 4.3c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 2 3.2 5 4.4 2.5 1 3 .8 3.5.7.5-.1 1.7-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.1-.3-.2-.6-.3l-2-1c-.3-.1-.5-.2-.7.2l-.9 1.1c-.2.2-.3.2-.6.1-.3-.2-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.5-.5.3-.5v-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5H9z"/></svg></a>
            </div>
          </div>
          <div><h4>Shop</h4><ul><li><a href="shop.html?cat=women">Women</a></li><li><a href="shop.html?cat=men">Men</a></li><li><a href="shop.html?cat=kids">Kids</a></li><li><a href="shop.html?cat=home">Home Textiles</a></li><li><a href="shop.html?badge=new">New Arrivals</a></li><li><a href="shop.html?badge=sale">Sale</a></li></ul></div>
          <div><h4>Help</h4><ul><li><a href="contact.html">Contact Us</a></li><li><a href="contact.html#faq">Shipping &amp; Delivery</a></li><li><a href="contact.html#faq">Returns &amp; Exchange</a></li><li><a href="contact.html#faq">Track Your Order</a></li><li><a href="contact.html#faq">Size &amp; Fabric Guide</a></li></ul></div>
          <div><h4>Company</h4><ul><li><a href="about.html">About BinAr</a></li><li><a href="about.html#values">Our Craft</a></li><li><a href="contact.html">Wholesale Enquiries</a></li><li><a href="contact.html">Careers</a></li><li><a href="#">Privacy Policy</a></li></ul></div>
          <div><h4>Get in touch</h4><ul class="footer__contact">
            <li><svg viewBox="0 0 24 24"><path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/></svg><span>Shop 12, Textile Market, Karachi, Pakistan</span></li>
            <li><svg viewBox="0 0 24 24"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/></svg><a href="tel:+923001234567">0300-1234567</a></li>
            <li><svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg><a href="mailto:hello@binarfabrics.pk">hello@binarfabrics.pk</a></li>
            <li><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg><span>Mon–Sat, 10am–7pm</span></li>
          </ul></div>
        </div>
        <div class="footer__bottom">
          <span>© ${new Date().getFullYear()} BinAr Fabrics. All rights reserved.</span>
          <div class="payments"><span>COD</span><span>VISA</span><span>MASTERCARD</span><span>JAZZCASH</span><span>EASYPAISA</span></div>
        </div>
      </div>
    </footer>`;
  }

  /* ---------- Product card ---------- */
  function productCard(p) {
    const wish = getWishlist().includes(p.id);
    const badge = p.badge === "sale" ? '<span class="badge badge--sale">Sale</span>'
      : p.badge === "new" ? '<span class="badge badge--new">New</span>'
      : p.badge === "low" ? '<span class="badge badge--low">Few left</span>' : "";
    return `
    <article class="product-card reveal" data-id="${p.id}">
      <div class="product-card__media">
        ${badge}
        <button class="wish-btn${wish ? " is-active" : ""}" data-wish="${p.id}" aria-label="Add to wishlist">${ICONS.heart}</button>
        <a href="product.html?id=${p.id}" aria-label="${p.name}">${swatch(p)}</a>
        <div class="product-card__quick"><button class="btn" data-add="${p.id}">Add to bag</button></div>
      </div>
      <div class="product-card__body">
        <div class="product-card__cat">${catName(p.category)} · ${p.fabric}</div>
        <h3 class="product-card__title"><a href="product.html?id=${p.id}">${p.name}</a></h3>
        ${priceHtml(p)}
        <div class="product-card__colors">${(p.colors || []).map((c) => `<span class="dot" style="background:${c}"></span>`).join("")}</div>
      </div>
    </article>`;
  }
  function priceHtml(p) {
    return p.oldPrice
      ? `<div class="price"><span class="price--sale">${money(p.price)}</span><del>${money(p.oldPrice)}</del></div>`
      : `<div class="price"><span>${money(p.price)}</span></div>`;
  }
  window.binarProductCard = productCard;
  window.binarPriceHtml = priceHtml;

  /* ---------- Wishlist ---------- */
  function getWishlist() { return store.get("binar_wishlist", []); }
  function toggleWishlist(id) {
    let list = getWishlist();
    const on = !list.includes(id);
    list = on ? [...list, id] : list.filter((x) => x !== id);
    store.set("binar_wishlist", list);
    $$(`[data-wish="${id}"]`).forEach((b) => b.classList.toggle("is-active", on));
    updateCounts();
    toast(on ? "Saved to your wishlist" : "Removed from wishlist", on ? { href: "shop.html?wishlist=1", label: "View" } : null);
  }

  /* ---------- Cart ---------- */
  function getCart() { return store.get("binar_cart", []); }
  function saveCart(c) { store.set("binar_cart", c); updateCounts(); renderCart(); }
  function addToCart(id, qty = 1, opts = {}) {
    const p = byId(id); if (!p) return;
    const cart = getCart();
    const key = id + "|" + (opts.color || "") + "|" + (opts.size || "");
    const line = cart.find((l) => l.key === key);
    if (line) line.qty += qty; else cart.push({ key, id, qty, color: opts.color || null, size: opts.size || null });
    saveCart(cart);
    toast(`Added “${p.name.split(" — ")[0]}” to your bag`, { action: "openCart", label: "View bag" });
  }
  function setQty(key, qty) {
    let cart = getCart();
    if (qty <= 0) cart = cart.filter((l) => l.key !== key);
    else cart.forEach((l) => { if (l.key === key) l.qty = qty; });
    saveCart(cart);
  }
  function cartTotals() {
    const cart = getCart();
    const subtotal = cart.reduce((s, l) => s + (byId(l.id)?.price || 0) * l.qty, 0);
    const count = cart.reduce((s, l) => s + l.qty, 0);
    const shipping = subtotal === 0 || subtotal >= FREE_SHIPPING_AT ? 0 : SHIPPING_FEE;
    return { cart, subtotal, count, shipping, total: subtotal + shipping };
  }
  function updateCounts() {
    const { count } = cartTotals();
    const c = $("#cartCount"); if (c) { c.textContent = count || ""; c.dataset.count = count; }
    const w = $("#wishCount"); const wl = getWishlist().length; if (w) { w.textContent = wl || ""; w.dataset.count = wl; }
  }
  function renderCart() {
    const body = $("#cartBody"), foot = $("#cartFoot"); if (!body) return;
    const { cart, subtotal, count, shipping, total } = cartTotals();
    $("#cartHeadCount").textContent = count ? `(${count})` : "";
    if (!cart.length) {
      body.innerHTML = `<div class="cart-drawer__empty">${ICONS.bag}<p>Your bag is empty.</p><p style="margin-top:16px"><a class="btn btn--primary btn--sm" href="shop.html" data-close-cart>Start shopping</a></p></div>`;
      foot.innerHTML = ""; return;
    }
    body.innerHTML = cart.map((l) => {
      const p = byId(l.id); if (!p) return "";
      const meta = [p.fabric, l.size ? `Size ${l.size}` : null, l.color ? "Colour selected" : null].filter(Boolean).join(" · ");
      return `<div class="cart-item">
        <a href="product.html?id=${p.id}">${swatch(p)}</a>
        <div><div class="cart-item__title">${p.name}</div><div class="cart-item__meta">${meta}</div>
          <div class="qty"><button data-qty="${l.key}" data-delta="-1" aria-label="Decrease">−</button><span>${l.qty}</span><button data-qty="${l.key}" data-delta="1" aria-label="Increase">+</button></div></div>
        <div><div class="cart-item__price">${money(p.price * l.qty)}</div><button class="cart-item__remove" data-remove="${l.key}">Remove</button></div>
      </div>`;
    }).join("");
    const remaining = Math.max(0, FREE_SHIPPING_AT - subtotal);
    const pct = Math.min(100, Math.round((subtotal / FREE_SHIPPING_AT) * 100));
    foot.innerHTML = `
      <div style="font-size:13px">${remaining > 0 ? `Add <strong>${money(remaining)}</strong> more for free delivery` : `<strong style="color:var(--green)">You've unlocked free delivery ✓</strong>`}</div>
      <div class="progress"><span style="width:${pct}%"></span></div>
      <div class="cart-drawer__row"><span>Subtotal</span><span>${money(subtotal)}</span></div>
      <div class="cart-drawer__row"><span>Delivery</span><span>${shipping ? money(shipping) : "Free"}</span></div>
      <div class="cart-drawer__row cart-drawer__row--total"><span>Total</span><span>${money(total)}</span></div>
      <button class="btn btn--green btn--block" id="checkoutBtn">Proceed to checkout</button>
      <div class="cart-drawer__note">Cash on delivery, JazzCash, Easypaisa &amp; cards accepted</div>`;
  }
  function openCart() { $("#cartDrawer").classList.add("is-open"); document.body.classList.add("no-scroll"); renderCart(); }
  function closeCart() { $("#cartDrawer").classList.remove("is-open"); document.body.classList.remove("no-scroll"); }
  window.binarAddToCart = addToCart;

  /* ---------- Toast ---------- */
  let toastTimer;
  function toast(msg, link) {
    const t = $("#toast"); if (!t) return;
    t.innerHTML = msg + (link ? (link.action === "openCart" ? `<a href="#" data-open-cart>${link.label}</a>` : `<a href="${link.href}">${link.label}</a>`) : "");
    t.classList.add("is-visible");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("is-visible"), 3200);
  }
  window.binarToast = toast;

  /* ---------- Search ---------- */
  function openSearch() { $("#search").classList.add("is-open"); document.body.classList.add("no-scroll"); setTimeout(() => $("#searchInput").focus(), 50); }
  function closeSearch() { $("#search").classList.remove("is-open"); document.body.classList.remove("no-scroll"); }
  function runSearch(q) {
    const out = $("#searchResults"); q = q.trim().toLowerCase();
    if (!q) { out.innerHTML = ""; return; }
    const hits = PRODUCTS.filter((p) => [p.name, p.fabric, p.category, p.collection, p.description, catName(p.category)].join(" ").toLowerCase().includes(q));
    out.innerHTML = hits.length
      ? `<div class="search__results">${hits.slice(0, 8).map(productCard).join("")}</div>`
      : `<div class="search__empty">No results for “${q}”. Try “lawn”, “men” or “chiffon”.</div>`;
    $$(".reveal", out).forEach((el) => el.classList.add("is-in"));
  }

  /* ---------- Scroll reveal ---------- */
  function initReveal() {
    if (!("IntersectionObserver" in window)) { $$(".reveal").forEach((el) => el.classList.add("is-in")); return; }
    const io = new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } }), { threshold: 0.08 });
    $$(".reveal").forEach((el) => io.observe(el));
  }
  window.binarReveal = initReveal;

  /* ---------- Global event delegation ---------- */
  function bindEvents() {
    document.addEventListener("click", (e) => {
      const t = e.target.closest("button, a"); if (!t) return;
      if (t.id === "cartOpen" || t.hasAttribute("data-open-cart")) { e.preventDefault(); openCart(); }
      else if (t.hasAttribute("data-close-cart")) closeCart();
      else if (t.id === "menuToggle") { $("#mobileNav").classList.add("is-open"); document.body.classList.add("no-scroll"); }
      else if (t.hasAttribute("data-close-mobile")) { $("#mobileNav").classList.remove("is-open"); document.body.classList.remove("no-scroll"); }
      else if (t.id === "searchOpen") openSearch();
      else if (t.id === "searchClose") closeSearch();
      else if (t.dataset.q) { $("#searchInput").value = t.dataset.q; runSearch(t.dataset.q); }
      else if (t.dataset.add) { e.preventDefault(); addToCart(t.dataset.add); }
      else if (t.dataset.wish) { e.preventDefault(); toggleWishlist(t.dataset.wish); }
      else if (t.dataset.qty) { const line = getCart().find((l) => l.key === t.dataset.qty); if (line) setQty(line.key, line.qty + Number(t.dataset.delta)); }
      else if (t.dataset.remove) setQty(t.dataset.remove, 0);
      else if (t.id === "checkoutBtn") { toast("Checkout is a demo — connect your payment gateway here."); }
    });
    document.addEventListener("click", (e) => { if (e.target.closest("[data-close-mobile]")) return; if (e.target.closest("#mobileNav") && e.target.closest("a")) { $("#mobileNav").classList.remove("is-open"); document.body.classList.remove("no-scroll"); } });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") { closeCart(); closeSearch(); $("#mobileNav").classList.remove("is-open"); document.body.classList.remove("no-scroll"); } });
    $("#searchInput").addEventListener("input", (e) => runSearch(e.target.value));
    $("#newsletterForm").addEventListener("submit", (e) => { e.preventDefault(); e.target.reset(); toast("Thanks for subscribing — welcome to BinAr!"); });
  }

  /* ---------- Boot ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    document.body.insertAdjacentHTML("afterbegin", renderHeader());
    document.body.insertAdjacentHTML("beforeend", renderFooter());
    bindEvents();
    updateCounts();
    renderCart();
    if (typeof window.binarPage === "function") window.binarPage({ PRODUCTS, CATEGORIES, swatch, productCard, priceHtml, money, byId, catName, getWishlist, $, $$ });
    initReveal();
  });
})();
