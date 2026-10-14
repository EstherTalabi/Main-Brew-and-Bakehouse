// Brew and Bakehouse cart, filter, search, checkout and premium interactions
(function () {
  // Navbar shadow on scroll
  var nav = document.querySelector(".navbar");
  function onScroll() { if (nav) nav.classList.toggle("scrolled", window.scrollY > 8); }
  window.addEventListener("scroll", onScroll, { passive: true }); onScroll();

  // Side drawer menu (mobile): slides in from the right, page stays interactive
  var drawerToggler = document.querySelector(".js-drawer-toggle");
  var drawer = document.getElementById("navMenu");
  if (drawerToggler && drawer) {
    function setDrawer(open) {
      document.body.classList.toggle("drawer-open", open);
      drawerToggler.setAttribute("aria-expanded", open ? "true" : "false");
      drawerToggler.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    }
    drawerToggler.addEventListener("click", function () {
      setDrawer(!document.body.classList.contains("drawer-open"));
    });
    drawer.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () { setDrawer(false); });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") setDrawer(false);
    });
    window.addEventListener("resize", function () {
      if (window.innerWidth >= 992) setDrawer(false);
    });
  }

  // Reveal on scroll
  try {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    document.querySelectorAll(".reveal").forEach(function (el) { io.observe(el); });
  } catch (e) {
    document.querySelectorAll(".reveal").forEach(function (el) { el.classList.add("in"); });
  }

  const CART_KEY = "bb_cart_v2";

  function normalize(list) {
    if (!Array.isArray(list)) return [];
    return list.map(function (i) {
      return {
        name: String((i && i.name) || "").slice(0, 60),
        price: Math.max(0, Number((i && i.price)) || 0),
        qty: Math.max(0, Math.floor(Number((i && i.qty)) || 0))
      };
    }).filter(function (i) { return i.name && i.price > 0 && i.qty > 0 && i.qty <= 99; });
  }

  function loadRaw() {
    try {
      const legacy = JSON.parse(localStorage.getItem("cart")) || null;
      const next = JSON.parse(localStorage.getItem(CART_KEY)) || null;
      // migrate legacy flat array [{name,price}...] -> grouped
      if (!next && Array.isArray(legacy)) {
        const grouped = {};
        legacy.forEach(function (i) {
          if (!i || !i.name) return;
          const k = i.name;
          if (!grouped[k]) grouped[k] = { name: i.name, price: Number(i.price) || 0, qty: 0 };
          grouped[k].qty += 1;
        });
        const arr = normalize(Object.values(grouped));
        localStorage.setItem(CART_KEY, JSON.stringify(arr));
        localStorage.removeItem("cart");
        return arr;
      }
      return normalize(next || []);
    } catch (e) { return []; }
  }

  function prefersReduced() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  let cart = loadRaw();

  function save() { localStorage.setItem(CART_KEY, JSON.stringify(cart)); }
  function cartQty() { return cart.reduce(function (s, i) { return s + (i.qty || 0); }, 0); }
  function cartTotal() { return cart.reduce(function (s, i) { return s + (i.price * (i.qty || 0)); }, 0); }
  function fmt(n) { return "₦" + Number(n).toLocaleString("en-NG"); }

  function updateBadges() {
    document.querySelectorAll(".cart-count").forEach(function (el) { el.textContent = cartQty(); });
    const mt = document.getElementById("menuCartTotal");
    if (mt) mt.textContent = fmt(cartTotal());
    const st = document.getElementById("stickyCartTotal");
    if (st) st.textContent = fmt(cartTotal());
    const bar = document.getElementById("stickyBar");
    if (bar) bar.classList.toggle("show", cartQty() > 0);
  }

  function toast(msg, linkText, linkHref) {
    const stack = document.getElementById("toastStack");
    if (!stack) return;
    const div = document.createElement("div");
    div.className = "toast-item";
    const span = document.createElement("span");
    span.textContent = msg;
    div.appendChild(span);
    if (linkText && linkHref) {
      const a = document.createElement("a");
      a.href = linkHref; a.textContent = linkText;
      div.appendChild(a);
    }
    stack.appendChild(div);
    setTimeout(function () {
      div.style.opacity = "0";
      div.style.transition = "opacity .3s";
      setTimeout(function () { div.remove(); }, 320);
    }, 2600);
  }

  // ---- Add to cart (delegated, works for static + instant result buttons) ----
  function handleAdd(btn) {
    const name = btn.getAttribute("data-name");
    const price = Number(btn.getAttribute("data-price"));
    if (!name || !price || btn.disabled) return;
    const found = cart.find(function (i) { return i.name === name; });
    if (found) found.qty += 1;
    else cart.push({ name: name, price: price, qty: 1 });
    save(); updateBadges();
    const original = btn.textContent;
    btn.textContent = "Added ✓";
    btn.disabled = true;
    setTimeout(function () { btn.textContent = original; btn.disabled = false; }, 900);
    toast(name + " added to cart", "View cart", "checkout.html");
  }

  document.addEventListener("click", function (e) {
    const btn = e.target && e.target.closest ? e.target.closest(".add-btn") : null;
    if (btn) handleAdd(btn);
  });

  // ---- Sold out flags. Add exact item names here to disable them everywhere.
  const SOLD_OUT = [];
  function applySoldOut() {
    document.querySelectorAll(".add-btn").forEach(function (btn) {
      if (SOLD_OUT.indexOf(btn.getAttribute("data-name")) === -1) return;
      btn.disabled = true;
      btn.textContent = "Sold out";
      const card = btn.closest(".menu-item") || btn.closest(".pick-card");
      if (card) {
        card.classList.add("soldout");
        if (!card.querySelector(".soldout-badge")) {
          const wrap = document.createElement("div");
          const badge = document.createElement("span");
          badge.className = "soldout-badge";
          badge.textContent = "Sold out";
          wrap.appendChild(badge);
          card.insertBefore(wrap, card.firstChild);
        }
      }
    });
  }
  applySoldOut();

  updateBadges();

  // ---- Menu: filter + search ----
  const filterButtons = document.querySelectorAll(".filter-btn");
  const menuCards = document.querySelectorAll(".menu-card");
  const searchInput = document.getElementById("menuSearch");
  const menuCount = document.getElementById("menuCount");
  const noResults = document.getElementById("noResults");
  let activeFilter = "all";
  let query = "";

  var menuSections = document.querySelectorAll("[data-category-section]");
  var totalItems = menuCards.length;

  function setFilter(value) {
    activeFilter = value;
    filterButtons.forEach(function (b) {
      var on = b.getAttribute("data-filter") === value;
      b.classList.toggle("active", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  function applyMenuFilters() {
    let visible = 0;
    menuCards.forEach(function (card) {
      const cat = card.getAttribute("data-category");
      const text = (card.textContent || "").toLowerCase();
      const matchCat = activeFilter === "all" || cat === activeFilter;
      const matchQ = !query || text.includes(query);
      const show = matchCat && matchQ;
      card.classList.toggle("hidden", !show);
      if (show) visible += 1;
    });
    menuSections.forEach(function (sec) {
      const cards = sec.querySelectorAll(".menu-card");
      let n = 0;
      cards.forEach(function (c) { if (!c.classList.contains("hidden")) n += 1; });
      sec.classList.toggle("hidden-section", n === 0);
      const label = sec.querySelector("[data-section-count]");
      if (label) label.textContent = n + (n === 1 ? " item" : " items");
    });
    if (menuCount) {
      menuCount.textContent = (activeFilter === "all" && !query)
        ? totalItems + " items across 6 categories"
        : visible + " of " + totalItems + (visible === 1 ? " item" : " items");
    }
    if (noResults) noResults.classList.toggle("d-none", visible !== 0);
  }

  if (filterButtons.length && menuCards.length) {
    filterButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        setFilter(button.getAttribute("data-filter"));
        applyMenuFilters();
      });
    });
    const suggestBox = document.getElementById("searchSuggest");

    function escHtml(s) {
      return String(s).replace(/[&<>"']/g, function (c) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
      });
    }

    function hideSuggest() {
      if (suggestBox) suggestBox.hidden = true;
      if (searchInput) searchInput.setAttribute("aria-expanded", "false");
    }

    function jumpToResults() {
      const list = document.getElementById("menuList");
      if (list) list.scrollIntoView({ behavior: prefersReduced() ? "auto" : "smooth", block: "start" });
      hideSuggest();
      if (searchInput) searchInput.blur();
    }

    function renderSuggest() {
      if (!suggestBox || !searchInput) return;
      if (query.length < 2) { hideSuggest(); return; }
      const matches = [];
      menuCards.forEach(function (card) {
        const btn = card.querySelector(".add-btn");
        const title = card.querySelector("h3");
        if (!btn || !title || btn.disabled) return;
        const text = (card.textContent || "").toLowerCase();
        if (!text.includes(query)) return;
        if (activeFilter !== "all" && card.getAttribute("data-category") !== activeFilter) return;
        matches.push({ name: btn.getAttribute("data-name"), price: btn.getAttribute("data-price") });
      });
      if (!matches.length) {
        suggestBox.innerHTML = "<div class='suggest-empty'>No instant matches. Showing full results below.</div>";
      } else {
        let html = "<div class='search-suggest-header'><span>" + matches.length + (matches.length === 1 ? " match" : " matches") + "</span><span>Top picks</span></div>";
        matches.slice(0, 6).forEach(function (m) {
          html += "<div class='suggest-item'><div><span class='suggest-name'>" + escHtml(m.name) + "</span>"
            + "<span class='suggest-price'>" + fmt(Number(m.price)) + "</span></div>"
            + "<button class='btn add-btn' data-name='" + escHtml(m.name) + "' data-price='" + escHtml(m.price) + "'>Add</button></div>";
        });
        html += "<button class='suggest-viewall' data-jump>See all " + matches.length + (matches.length === 1 ? " result" : " results") + "</button>";
        suggestBox.innerHTML = html;
      }
      suggestBox.hidden = false;
      searchInput.setAttribute("aria-expanded", "true");
    }

    if (searchInput) {
      searchInput.addEventListener("input", function () {
        query = searchInput.value.trim().toLowerCase();
        applyMenuFilters();
        renderSuggest();
      });
      searchInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter") { e.preventDefault(); jumpToResults(); }
        if (e.key === "Escape") { hideSuggest(); searchInput.blur(); }
      });
      searchInput.addEventListener("blur", function () {
        setTimeout(hideSuggest, 180);
      });
      searchInput.addEventListener("focus", function () {
        if (query.length >= 2) renderSuggest();
      });
    }
    if (suggestBox) {
      suggestBox.addEventListener("click", function (e) {
        if (e.target && e.target.closest && e.target.closest("[data-jump]")) jumpToResults();
      });
    }
    const clearBtn = document.getElementById("clearSearchBtn");
    if (clearBtn) clearBtn.addEventListener("click", function () {
      if (searchInput) searchInput.value = "";
      query = "";
      setFilter("all");
      applyMenuFilters();
      hideSuggest();
    });
    applyMenuFilters();
  }

  // ---- Group Office Box estimator (order page) ----
  const gCount = document.getElementById("gCount");
  if (gCount) {
    const COFFEE = { name: "Flat White", price: 3200 };
    const PASTRY = { name: "Butter Croissant", price: 2500 };
    // Team treat, honored by staff at pickup. Change both numbers in one place.
    const TEAM_TREAT_MIN = 10, TEAM_TREAT_PCT = 5;
    let heads = 6;
    const MINH = 5, MAXH = 50;
    const gSummary = document.getElementById("gSummary");

    function renderGroup() {
      gCount.textContent = heads;
      const total = heads * (COFFEE.price + PASTRY.price);
      if (gSummary) {
        let txt = heads + " coffees plus " + heads + " pastries • about " + fmt(total);
        if (heads >= TEAM_TREAT_MIN) {
          txt += ". Team treat unlocked • " + TEAM_TREAT_PCT + "% off • now about " + fmt(Math.round(total * (100 - TEAM_TREAT_PCT) / 100));
        } else {
          txt += ". " + TEAM_TREAT_MIN + " or more unlocks " + TEAM_TREAT_PCT + "% off.";
        }
        gSummary.textContent = txt;
      }
      const minus = document.getElementById("gMinus");
      const plus = document.getElementById("gPlus");
      if (minus) minus.disabled = heads <= MINH;
      if (plus) plus.disabled = heads >= MAXH;
    }

    const gMinus = document.getElementById("gMinus");
    const gPlus = document.getElementById("gPlus");
    if (gMinus) gMinus.addEventListener("click", function () { if (heads > MINH) { heads -= 1; renderGroup(); } });
    if (gPlus) gPlus.addEventListener("click", function () { if (heads < MAXH) { heads += 1; renderGroup(); } });

    const gAdd = document.getElementById("gAddBtn");
    if (gAdd) {
      gAdd.addEventListener("click", function () {
        const c = cart.find(function (i) { return i.name === COFFEE.name; });
        if (c) c.qty += heads; else cart.push({ name: COFFEE.name, price: COFFEE.price, qty: heads });
        const p = cart.find(function (i) { return i.name === PASTRY.name; });
        if (p) p.qty += heads; else cart.push({ name: PASTRY.name, price: PASTRY.price, qty: heads });
        save(); updateBadges();
        toast("Office box for " + heads + " added to bag", "View bag", "checkout.html");
      });
    }
    renderGroup();
  }

  // ---- Cart page ----
  const cartBox = document.getElementById("cartBox");
  if (cartBox) {
    const cartActions = document.getElementById("cartActions");
    const cartTotalEl = document.getElementById("cartTotal");
    const checkoutForm = document.getElementById("checkoutForm");
    const browseBtn = document.getElementById("browseBtn");

    // Fulfillment: pickup or delivery with zone fees. Change zones and fees in one place.
    let fulfill = "pickup";
    let zoneIdx = 0;
    const DELIVERY_ZONES = [{ name: "Yaba", fee: 1000 }, { name: "Surulere", fee: 1500 }, { name: "Lagos Island", fee: 2000 }];
    const FREE_DELIVERY_OVER = 20000;
    function deliveryFee(sub) {
      if (fulfill === "pickup") return 0;
      if (sub >= FREE_DELIVERY_OVER) return 0;
      return DELIVERY_ZONES[zoneIdx].fee;
    }
    function grandTotal() { const sub = cartTotal(); return sub + deliveryFee(sub); }
    function updateTotals() {
      const sub = cartTotal(), fee = deliveryFee(sub), grand = sub + fee;
      if (cartTotalEl) cartTotalEl.textContent = "Items: " + fmt(sub);
      const feeLine = document.getElementById("feeLine");
      if (feeLine) {
        feeLine.textContent = fulfill === "pickup" ? "Pickup • free"
          : (fee === 0 ? "Delivery • free over " + fmt(FREE_DELIVERY_OVER)
          : "Delivery (" + DELIVERY_ZONES[zoneIdx].name + "): " + fmt(fee));
      }
      const grandEl = document.getElementById("grandTotal");
      if (grandEl) grandEl.textContent = "Total: " + fmt(grand);
      updateEta();
    }
    const LOYAL_KEY = "bb_loyalty_v1";
    function stamps() {
      try { return Math.max(0, Math.floor(Number(localStorage.getItem(LOYAL_KEY)) || 0)); }
      catch (e) { return 0; }
    }
    function renderLoyalty() {
      const el = document.getElementById("loyaltyLine");
      if (!el) return;
      const total = stamps(), have = total % 9;
      if (total > 0 && have === 0) {
        el.textContent = "Treat unlocked! Show this screen for a free pastry.";
      } else if (have === 0) {
        el.textContent = "Every order earns a stamp • 9 stamps earn a free pastry.";
      } else {
        el.textContent = "Your stamps: " + have + " of 9 • " + (9 - have) + " to a free pastry.";
      }
    }

    function updateEta() {
      const el = document.getElementById("cartEta");
      if (!el) return;
      if (!cart.length) { el.textContent = ""; return; }
      const mins = 10 + Math.min(30, cartQty() * 2) + (fulfill === "delivery" ? 15 : 0);
      const t = new Date(Date.now() + mins * 60000);
      const h = t.getHours(), m = t.getMinutes();
      const ap = h >= 12 ? "pm" : "am";
      const h12 = h % 12 === 0 ? 12 : h % 12;
      el.textContent = "Ready about " + h12 + ":" + (m < 10 ? "0" + m : m) + ap + ".";
    }

    function esc(s) {
      return String(s).replace(/[&<>"']/g, function (c) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
      });
    }

    function renderCart() {
      updateBadges();
      renderLoyalty();
      if (!cart.length) {
        cartBox.innerHTML = "<p class='text-center text-muted py-5 mb-0'>Your cart is empty.<br>Add something tasty from the menu.</p>";
        if (cartActions) cartActions.style.display = "none";
        if (checkoutForm) checkoutForm.style.display = "none";
        if (browseBtn) browseBtn.style.display = "block";
        return;
      }
      let html = "";
      cart.forEach(function (item, idx) {
        html += "<div class='cart-line'>"
          + "<div><div class='cart-line-name'>" + esc(item.name) + "</div>"
          + "<div class='cart-line-unit'>" + fmt(item.price) + " each · <button class='cart-remove' data-remove='" + idx + "'>remove</button></div></div>"
          + "<div class='cart-line-right'><div class='qty-controls'>"
          + "<button class='qty-btn' data-dec='" + idx + "' aria-label='Decrease quantity'>−</button>"
          + "<span class='qty-num'>" + item.qty + "</span>"
          + "<button class='qty-btn' data-inc='" + idx + "' aria-label='Increase quantity'>+</button>"
          + "</div><span class='cart-line-price'>" + fmt(item.price * item.qty) + "</span></div>"
          + "</div>";
      });
      cartBox.innerHTML = html;
      if (cartActions) cartActions.style.display = "block";
      updateTotals();
      if (checkoutForm) checkoutForm.style.display = "block";
      if (browseBtn) browseBtn.style.display = "none";

      cartBox.querySelectorAll("[data-inc]").forEach(function (b) {
        b.addEventListener("click", function () {
          cart[Number(b.dataset.inc)].qty += 1; save(); renderCart();
        });
      });
      cartBox.querySelectorAll("[data-dec]").forEach(function (b) {
        b.addEventListener("click", function () {
          const i = Number(b.dataset.dec);
          cart[i].qty -= 1;
          if (cart[i].qty <= 0) cart.splice(i, 1);
          save(); renderCart();
        });
      });
      cartBox.querySelectorAll("[data-remove]").forEach(function (b) {
        b.addEventListener("click", function () {
          cart.splice(Number(b.dataset.remove), 1); save(); renderCart();
        });
      });
    }

    renderCart();
    renderLastOrder();

    const zoneSel = document.getElementById("deliveryZone");
    if (zoneSel) {
      zoneSel.innerHTML = DELIVERY_ZONES.map(function (z, i) {
        return "<option value='" + i + "'>" + z.name + " • " + fmt(z.fee) + "</option>";
      }).join("");
      zoneSel.addEventListener("change", function () {
        zoneIdx = Math.max(0, Math.min(DELIVERY_ZONES.length - 1, Number(zoneSel.value) || 0));
        updateTotals();
      });
    }
    const pickupBtn = document.getElementById("pickupBtn");
    const deliveryBtn = document.getElementById("deliveryBtn");
    function setFulfill(v) {
      fulfill = v;
      const isPickup = v === "pickup";
      if (pickupBtn) { pickupBtn.classList.toggle("active", isPickup); pickupBtn.setAttribute("aria-pressed", isPickup ? "true" : "false"); }
      if (deliveryBtn) { deliveryBtn.classList.toggle("active", !isPickup); deliveryBtn.setAttribute("aria-pressed", !isPickup ? "true" : "false"); }
      const df = document.getElementById("deliveryFields");
      const zw = document.getElementById("zoneWrap");
      if (df) df.style.display = isPickup ? "none" : "block";
      if (zw) zw.style.display = isPickup ? "none" : "block";
      updateTotals();
    }
    if (pickupBtn) pickupBtn.addEventListener("click", function () { setFulfill("pickup"); });
    if (deliveryBtn) deliveryBtn.addEventListener("click", function () { setFulfill("delivery"); });

    function renderLastOrder() {
      const panel = document.getElementById("lastOrder");
      if (!panel) return;
      if (cart.length) { panel.style.display = "none"; return; }
      let last = null;
      try { last = JSON.parse(localStorage.getItem("bb_last_order_v1")); } catch (e) {}
      if (!last || !last.items || !last.items.length) { panel.style.display = "none"; return; }
      const n = last.items.reduce(function (s, i) { return s + (i.qty || 0); }, 0);
      const wayShort = last.fulfill === "delivery" ? "Delivery " + last.time : "Pickup " + last.time;
      panel.innerHTML = "<p class='eyebrow mb-1'>Your last order</p>"
        + "<p class='last-order-title mb-1'>Order " + esc(last.no) + " • " + n + (n === 1 ? " item" : " items") + " • " + fmt(last.total) + "</p>"
        + "<p class='text-muted small mb-2'>" + esc(wayShort) + " • show this at the counter.</p>"
        + "<button class='btn btn-dark-pill btn-sm' id='reorderBtn'>Order again</button>";
      panel.style.display = "block";
      const rb = document.getElementById("reorderBtn");
      if (rb) rb.addEventListener("click", function () {
        last.items.forEach(function (li) {
          const q = Math.max(1, Math.min(99, Number(li.qty) || 1));
          const ex = cart.find(function (i) { return i.name === li.name; });
          if (ex) ex.qty = Math.min(99, ex.qty + q);
          else cart.push({ name: li.name, price: Number(li.price) || 0, qty: q });
        });
        save(); updateBadges(); renderCart();
        panel.style.display = "none";
        toast("Your last order is back in the bag.");
      });
    }

    // Opening hours in minutes from midnight. Key is JS getDay(): 0 is Sunday.
    const OPEN_HOURS = { 0: [540, 1020], 1: [420, 1140], 2: [420, 1140], 3: [420, 1140], 4: [420, 1140], 5: [420, 1140], 6: [480, 1140] };
    const LEAD_MIN = 15;
    // Shop WhatsApp number in international digits (2349159898348).
    const SHOP_WHATSAPP = "2349159898348";

    function toMin(str) {
      const parts = String(str).split(":");
      if (parts.length < 2) return null;
      const h = Number(parts[0]), m = Number(parts[1]);
      if (isNaN(h) || isNaN(m)) return null;
      return h * 60 + m;
    }

    function fmtClock(mins) {
      const h = Math.floor(mins / 60), m = mins % 60;
      const ap = h >= 12 ? "pm" : "am";
      const h12 = h % 12 === 0 ? 12 : h % 12;
      return h12 + ":" + (m < 10 ? "0" + m : m) + ap;
    }

    function setPickupHint(msg, isError) {
      const hint = document.getElementById("pickupHint");
      if (!hint) return;
      if (!msg) {
        hint.textContent = "Same day pickup only • at least 15 min ahead • within opening hours.";
        hint.classList.remove("error");
      } else {
        hint.textContent = msg;
        hint.classList.toggle("error", !!isError);
      }
    }

    function validatePickup(time) {
      const mins = toMin(time);
      if (mins === null) return { ok: false, msg: "Please choose a pickup time." };
      const now = new Date();
      const hours = OPEN_HOURS[now.getDay()];
      const nowMins = now.getHours() * 60 + now.getMinutes();
      if (mins < hours[0] || mins > hours[1]) {
        return { ok: false, msg: "We are open " + fmtClock(hours[0]) + " to " + fmtClock(hours[1]) + " today. Pick a time inside those hours." };
      }
      if (mins < nowMins + LEAD_MIN) {
        return { ok: false, msg: "Give us at least 15 min to prepare. The earliest pickup right now is " + fmtClock(nowMins + LEAD_MIN) + "." };
      }
      return { ok: true };
    }

    function readCheckout() {
      const addrEl = document.getElementById("deliveryAddress");
      return {
        name: document.getElementById("customerName").value.trim(),
        phone: document.getElementById("customerPhone").value.trim(),
        email: document.getElementById("customerEmail").value.trim(),
        time: document.getElementById("pickupTime").value,
        notes: document.getElementById("specialRequests").value.trim(),
        fulfill: fulfill,
        address: addrEl ? addrEl.value.trim() : "",
        zone: DELIVERY_ZONES[zoneIdx].name
      };
    }

    function validateCheckout(f, needsEmail) {
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email);
      const phoneOk = /^[0-9+\s-]{7,15}$/.test(f.phone);
      if (!f.name || !f.phone || (needsEmail && !f.email) || !f.time) {
        toast("Please fill in all required fields.");
        return false;
      }
      if (needsEmail && !emailOk) { toast("Please enter a valid email."); return false; }
      if (!phoneOk) { toast("Please enter a valid phone number."); return false; }
      if (!cart.length) { toast("Your cart is empty."); return false; }
      if (f.fulfill === "delivery" && !f.address) { toast("Please add a delivery address."); return false; }
      const check = validatePickup(f.time);
      setPickupHint(check.ok ? null : check.msg, !check.ok);
      if (!check.ok) return false;
      return true;
    }

    const placeBtn = document.getElementById("placeOrderBtn");
    if (placeBtn) {
      placeBtn.addEventListener("click", function () {
        const f = readCheckout();
        if (!validateCheckout(f, true)) return;

        const orderNo = "BB-" + Math.floor(1000 + Math.random() * 9000);
        const sub = cartTotal(), fee = deliveryFee(sub), grand = sub + fee;
        const wayText = f.fulfill === "delivery"
          ? "Delivery to " + f.address + " (" + f.zone + ") at " + f.time + (fee > 0 ? ", delivery fee " + fmt(fee) : ", free delivery")
          : "Pickup at " + f.time;
        const newStamps = stamps() + 1;
        try { localStorage.setItem(LOYAL_KEY, String(newStamps)); } catch (e) {}
        const treatUnlocked = newStamps % 9 === 0;
        const success = document.getElementById("orderSuccess");
        if (success) {
          success.style.display = "block";
          success.innerHTML = "<h5>Order " + orderNo + " placed successfully!</h5>"
            + "<p class='mb-0'>Thank you, " + esc(f.name) + "! " + esc(wayText)
            + ". Total: <strong>" + fmt(grand) + "</strong>. See you soon.</p>"
            + (treatUnlocked ? "<p class='mb-0 treat-note'>Treat unlocked! Show this screen for a free pastry.</p>" : "");
          success.scrollIntoView({ behavior: prefersReduced() ? "auto" : "smooth", block: "center" });
        }
        renderLoyalty();
        try {
          localStorage.setItem("bb_last_order_v1", JSON.stringify({
            no: orderNo,
            items: cart.map(function (i) { return { name: i.name, price: i.price, qty: i.qty }; }),
            total: grand,
            name: f.name,
            time: f.time,
            fulfill: f.fulfill,
            address: f.address,
            zone: f.zone
          }));
        } catch (e) {}
        cart = []; save(); updateBadges();
        placeBtn.style.display = "none";
        const clearBtn = document.getElementById("clearCartBtn");
        if (clearBtn) clearBtn.style.display = "none";
        setTimeout(renderCartEmptyState, 400);
        function renderCartEmptyState() {
          // keep success visible, show empty cart box
          cartBox.innerHTML = "<p class='text-center text-muted py-4 mb-0'>Cart cleared. Order confirmed above.</p>";
          if (cartActions) cartActions.style.display = "none";
        }
      });
    }

    const checkoutFields = document.getElementById("checkoutFields");
    if (checkoutFields && placeBtn) {
      checkoutFields.addEventListener("submit", function () {
        if (placeBtn.style.display !== "none") placeBtn.click();
      });
    }

    const pickupInput = document.getElementById("pickupTime");
    if (pickupInput) pickupInput.addEventListener("change", function () { setPickupHint(null, false); });

    const waBtn = document.getElementById("waOrderBtn");
    if (waBtn) {
      waBtn.addEventListener("click", function () {
        const f = readCheckout();
        if (!validateCheckout(f, false)) return;
        const lines = cart.map(function (i) {
          return i.qty + " x " + i.name + " (" + fmt(i.price * i.qty) + ")";
        });
        const wSub = cartTotal(), wFee = deliveryFee(wSub), wGrand = wSub + wFee;
        const wWay = f.fulfill === "delivery"
          ? "Delivery to " + f.address + " (" + f.zone + ")"
          : "Pickup";
        let msg = "Hello Brew and Bakehouse! I would like to order:\n" + lines.join("\n")
          + "\nSubtotal: " + fmt(wSub);
        if (wFee > 0) msg += "\nDelivery: " + fmt(wFee);
        msg += "\nTotal: " + fmt(wGrand)
          + "\n" + wWay
          + "\nName: " + f.name + "\nPhone: " + f.phone + "\nTime: " + f.time;
        if (f.notes) msg += "\nNotes: " + f.notes;
        window.open("https://wa.me/" + SHOP_WHATSAPP + "?text=" + encodeURIComponent(msg), "_blank");
      });
    }

    const clearCartBtn = document.getElementById("clearCartBtn");
    if (clearCartBtn) {
      clearCartBtn.addEventListener("click", function () {
        cart = []; save(); updateBadges(); renderCart();
        setPickupHint(null, false);
        toast("Cart cleared.");
      });
    }
  }
})();
