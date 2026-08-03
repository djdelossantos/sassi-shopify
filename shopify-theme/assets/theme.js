/* SASSi theme JS — Lenis smooth scroll + GSAP ScrollTrigger animations, plus a
   client-side page-transition router (fetch + swap <main>) so the orange intro
   overlay is never torn down and the transition is flicker-free.
   Framework-free; the feature code drops into a Shopify theme unchanged. The
   router is progressive enhancement — without it, links navigate normally. */
(function () {
  "use strict";

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasGsap = typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined";
  var docEl = document.documentElement;

  var intro = document.querySelector("[data-page-intro]");
  var introLogo = intro && intro.querySelector(".page-intro__logo"); // mask window
  var introMark = introLogo && introLogo.querySelector(".logo");      // the SVG that slides
  var canIntro = !reducedMotion && hasGsap && !!intro && !!introMark;

  // Reassigned by the header-theme setup; called by Lenis + after each swap.
  var updateHeaderTheme = function () {};
  var applyHeaderTheme = function () {};
  // Intro-motion callbacks fired once the cover (preloader on first load,
  // page-intro on swap) begins revealing the page — so on-load reveals aren't
  // wasted behind the cover. Registered fresh by buildMainMotion; fired once.
  var pageRevealHooks = [];
  var firePageReveal = function () {
    pageRevealHooks.splice(0).forEach(function (fn) { try { fn(); } catch (e) {} });
  };

  /* ===================== First-load preloader ===================== */
  // Runs on a real document load (fresh visit / refresh) only. The 00→100 count
  // is smart-synced: it creeps while loading and is paced to land on 100 the
  // moment the page is actually ready, with a short minimum so it's always seen.
  // Then the dark panel slides up to reveal the page.
  var pre = document.querySelector("[data-preloader]");
  if (pre) {
    var countEl = pre.querySelector("[data-preloader-count]");
    var preDone = false;
    var finishPre = function () {
      if (preDone) { return; }
      preDone = true;
      var hide = function () { pre.classList.add("is-done"); };
      firePageReveal(); // play on-load reveals as the panel lifts
      if (!reducedMotion && typeof gsap !== "undefined") {
        gsap.to(pre, { clipPath: "inset(0% 0% 100% 0%)", duration: 0.7, ease: "power2.inOut", onComplete: hide });
      } else {
        hide();
      }
    };

    if (reducedMotion) {
      // No count animation; snap to 100 and reveal (without motion) once loaded.
      if (countEl) { countEl.textContent = "100"; }
      var revealRM = function () { setTimeout(finishPre, 400); };
      if (document.readyState === "complete") { revealRM(); }
      else { window.addEventListener("load", revealRM, { once: true }); }
    } else {
      // Always runs the full 00→100 over a fixed duration, independent of how
      // fast the document actually loads — the count is the intro, not a
      // progress readout, so it shouldn't be cut short on a warm cache.
      var preStart = performance.now();
      var preDuration = 1800;
      var preFmt = function (n) {
        n = Math.max(0, Math.min(100, Math.round(n)));
        return n < 100 ? ("0" + n).slice(-2) : "100";
      };
      var preTick = function (now) {
        var t = Math.min(1, (now - preStart) / preDuration);
        // Ease out so it sprints early and settles onto 100 rather than
        // ticking at a flat, mechanical rate.
        var eased = 1 - Math.pow(1 - t, 2.2);
        if (countEl) { countEl.textContent = preFmt(eased * 100); }
        if (t >= 1) { finishPre(); return; }
        requestAnimationFrame(preTick);
      };
      requestAnimationFrame(preTick);
    }
  }

  /* ===================== Persistent header + menu ===================== */
  // The header lives outside <main>, so it survives page swaps and is set up
  // once. Its theme probe reads live DOM, so it just needs re-applying on swap.
  var header = document.querySelector("[data-header]");
  if (header) {
    var groups = [
      header.querySelector(".site-header__left"),
      header.querySelector(".site-header__logo"),
      header.querySelector(".site-header__icons")
    ].filter(Boolean);

    var themeAt = function (x, y) {
      var stack = document.elementsFromPoint(x, y) || [];
      for (var i = 0; i < stack.length; i++) {
        if (header.contains(stack[i])) continue;
        var tagged = stack[i].closest("[data-section-theme]");
        if (tagged) return tagged.getAttribute("data-section-theme");
      }
      return "dark";
    };

    var logoMark = header.querySelector(".site-header__logo-mark");

    var darkExtent = function (rect, y) {
      var leftDark = themeAt(rect.left + 1, y) !== "light";
      var rightDark = themeAt(rect.right - 1, y) !== "light";
      if (leftDark === rightDark) return leftDark ? 100 : 0;
      var lo = rect.left + 1, hi = rect.right - 1;
      for (var s = 0; s < 7; s++) {
        var mid = (lo + hi) / 2;
        if ((themeAt(mid, y) !== "light") === leftDark) lo = mid; else hi = mid;
      }
      var pct = ((lo - rect.left) / rect.width) * 100;
      return leftDark ? pct : 100 - pct;
    };

    var raf = 0;
    var headerApply = function () {
      raf = 0;
      // Search open = the bar is solid dark, so the per-section colouring would
      // fight it (white text on a light section still sits on our dark panel).
      // Pin everything to the light-on-dark treatment until it closes.
      if (header.classList.contains("is-search-open")) {
        for (var g = 0; g < groups.length; g++) {
          groups[g].classList.add("on-dark");
          groups[g].classList.remove("on-light");
        }
        if (logoMark) { logoMark.style.setProperty("--logo-split", "100%"); }
        header.classList.remove("site-header--no-scrim");
        return;
      }
      var y = header.offsetHeight * 0.5;
      var allDark = true;
      for (var i = 0; i < groups.length; i++) {
        var r = groups[i].getBoundingClientRect();
        var isDark =
          themeAt(r.left + 2, y) !== "light" ||
          themeAt((r.left + r.right) / 2, y) !== "light" ||
          themeAt(r.right - 2, y) !== "light";
        if (!isDark) allDark = false;
        groups[i].classList.toggle("on-dark", isDark);
        groups[i].classList.toggle("on-light", !isDark);
      }
      if (logoMark) {
        var lr = logoMark.getBoundingClientRect();
        logoMark.style.setProperty("--logo-split", darkExtent(lr, y).toFixed(1) + "%");
      }
      header.classList.toggle("site-header--no-scrim", !allDark);
    };

    applyHeaderTheme = headerApply;
    updateHeaderTheme = function () { if (!raf) raf = requestAnimationFrame(headerApply); };
    headerApply();
    window.addEventListener("scroll", updateHeaderTheme, { passive: true });
    window.addEventListener("resize", updateHeaderTheme);

    // Mobile menu drawer
    var menuToggle = document.querySelector("[data-menu-toggle]");
    if (menuToggle) {
      menuToggle.addEventListener("click", function () {
        var open = header.classList.toggle("is-open");
        menuToggle.setAttribute("aria-expanded", open ? "true" : "false");
        menuToggle.setAttribute("aria-label", open ? "Close menu" : "Menu");
        document.body.classList.toggle("has-menu-open", open);
        if (open) header.classList.remove("site-header--hidden");
        // Only one expanded panel at a time (setSearch is hoisted; may be undefined
        // if the header has no search field).
        if (open && typeof setSearch === "function") { setSearch(false); }
      });
      header.querySelectorAll(".site-header__drawer a").forEach(function (a) {
        a.addEventListener("click", function () {
          header.classList.remove("is-open");
          document.body.classList.remove("has-menu-open");
          menuToggle.setAttribute("aria-expanded", "false");
          menuToggle.setAttribute("aria-label", "Menu");
        });
      });
    }

    // Expanding search panel. The icon stays an <a> to /search so the no-JS path
    // still works; we intercept the click and grow the bar instead.
    var searchToggle = header.querySelector("[data-search-toggle]");
    var searchPanel = header.querySelector(".site-header__search");
    var searchInput = header.querySelector("[data-search-input]");
    if (searchToggle && searchPanel && searchInput) {
      // The panel's height is still CSS (grid 0fr->1fr); GSAP eases the field
      // itself in behind it so the two read as one move. Separate open/close
      // tweens so both ease out — see buildFilterTimeline for why.
      if (motionOn) { gsap.set(searchInput, { autoAlpha: 0, y: 10 }); }
      var animSearch = function (open) {
        if (!motionOn) { return; }
        gsap.to(searchInput, {
          autoAlpha: open ? 1 : 0, y: open ? 0 : 10,
          duration: open ? 0.4 : 0.28, ease: "power3.out",
          delay: open ? 0.1 : 0, overwrite: true
        });
      };
      var setSearch = function (open) {
        animSearch(open);
        header.classList.toggle("is-search-open", open);
        searchToggle.setAttribute("aria-expanded", open ? "true" : "false");
        if (open) {
          header.classList.remove("site-header--hidden");
          // Closing the burger menu first — two expanded panels can't coexist.
          if (header.classList.contains("is-open") && menuToggle) { menuToggle.click(); }
          searchInput.focus();
        } else {
          searchInput.blur();
        }
        applyHeaderTheme(); // repaint the icon/logo colours for the new state
      };

      searchToggle.addEventListener("click", function (e) {
        e.preventDefault();
        setSearch(!header.classList.contains("is-search-open"));
      });

      // Esc closes and hands focus back to the icon that opened it.
      document.addEventListener("keydown", function (e) {
        if (e.key !== "Escape" || !header.classList.contains("is-search-open")) { return; }
        setSearch(false);
        searchToggle.focus();
      });

      // Clicking away closes it, but never while the user is inside the panel.
      document.addEventListener("click", function (e) {
        if (!header.classList.contains("is-search-open")) { return; }
        if (header.contains(e.target)) { return; }
        setSearch(false);
      });
    }

    // Auto-hide on scroll down, reveal on scroll up (mobile-only in CSS)
    var lastY = window.scrollY;
    window.addEventListener("scroll", function () {
      var y = window.scrollY;
      if (header.classList.contains("is-open") || header.classList.contains("is-search-open")) { lastY = y; return; }
      if (y > lastY && y > 80) header.classList.add("site-header--hidden");
      else if (y < lastY) header.classList.remove("site-header--hidden");
      lastY = y;
    }, { passive: true });
  }

  /* ===================== Per-page feature init ===================== */
  // Everything below binds to elements inside <main>. After a swap those
  // elements are brand-new, so their old listeners are gone with the old DOM —
  // we just re-query and re-bind against the new content.

  function initQty() {
    var qty = document.querySelector("[data-qty]");
    if (!qty) return;
    var value = qty.querySelector("[data-qty-value]");
    var hidden = document.querySelector("[data-qty-input]"); // Shopify form quantity
    var sync = function () { if (hidden) { hidden.value = value.textContent; } };
    qty.querySelector("[data-qty-minus]").addEventListener("click", function () {
      value.textContent = Math.max(1, parseInt(value.textContent, 10) - 1); sync();
    });
    qty.querySelector("[data-qty-plus]").addEventListener("click", function () {
      value.textContent = parseInt(value.textContent, 10) + 1; sync();
    });
    sync();
  }

  // Shopify PDP: map the swatch/select choices to a variant and keep the hidden
  // variant id, price, and add-to-cart state in sync. Supersedes initSwatches when
  // a product-json payload is present.
  function initProductForm() {
    var form = document.querySelector(".pdp__form");
    var dataEl = document.querySelector("[data-product-json]");
    if (!form || !dataEl) return;
    var variants;
    try { variants = JSON.parse(dataEl.textContent); } catch (e) { return; }
    var idInput = form.querySelector("[name='id']");
    var addBtn = form.querySelector("[data-add]");
    var addLabel = addBtn && addBtn.querySelector(".btn__label");
    var priceEl = document.querySelector("[data-price]");
    var addText = dataEl.getAttribute("data-add-text") || "Add to bag";
    var soldoutText = dataEl.getAttribute("data-soldout-text") || "Sold out";
    var unavailableText = dataEl.getAttribute("data-unavailable-text") || "Unavailable";
    var groups = [].slice.call(document.querySelectorAll("[data-option-index]"));

    var chosen = function () {
      var opts = [];
      groups.forEach(function (g) {
        var idx = parseInt(g.getAttribute("data-option-index"), 10);
        var sel = g.querySelector("[data-option-select]");
        if (sel) { opts[idx] = sel.value; return; }
        var active = g.querySelector(".swatch.is-active");
        if (active) { opts[idx] = active.getAttribute("data-value"); }
      });
      return opts;
    };
    var match = function (opts) {
      for (var i = 0; i < variants.length; i++) {
        var v = variants[i], ok = true;
        for (var j = 0; j < opts.length; j++) {
          if (opts[j] != null && v.options[j] !== opts[j]) { ok = false; break; }
        }
        if (ok) return v;
      }
      return null;
    };
    var update = function () {
      var v = match(chosen());
      if (!v) {
        if (addBtn) { addBtn.disabled = true; }
        if (addLabel) { addLabel.textContent = unavailableText; }
        return;
      }
      if (idInput) { idInput.value = v.id; }
      if (priceEl) { priceEl.textContent = v.price; }
      if (addBtn) { addBtn.disabled = !v.available; }
      if (addLabel) { addLabel.textContent = v.available ? addText : soldoutText; }
    };

    groups.forEach(function (g) {
      var swatches = [].slice.call(g.querySelectorAll(".swatch"));
      swatches.forEach(function (sw) {
        sw.addEventListener("click", function () {
          swatches.forEach(function (s) { s.classList.remove("is-active"); s.setAttribute("aria-checked", "false"); });
          sw.classList.add("is-active"); sw.setAttribute("aria-checked", "true");
          var lbl = g.querySelector("[data-color-label]");
          if (lbl) { lbl.textContent = sw.getAttribute("data-value"); }
          update();
        });
      });
      var sel = g.querySelector("[data-option-select]");
      if (sel) { sel.addEventListener("change", update); }
    });

    // Add to bag without leaving the page, then slide the drawer in. If the
    // request fails we fall back to a normal form post so the shopper is never
    // stuck with a button that silently does nothing.
    form.addEventListener("submit", function (e) {
      if (!document.querySelector("[data-cart-drawer]")) { return; } // no drawer: native post
      e.preventDefault();
      var busyLabel = addLabel ? addLabel.textContent : "";
      if (addBtn) { addBtn.disabled = true; }
      fetch("/cart/add.js", {
        method: "POST",
        headers: { Accept: "application/json" },
        body: new FormData(form)
      })
        .then(function (res) { return res.ok ? res.json() : Promise.reject(res); })
        .then(function () { return cartDrawer.refresh(); })
        .then(function () {
          cartDrawer.open();
          if (addBtn) { addBtn.disabled = false; }
          if (addLabel) { addLabel.textContent = busyLabel; }
        })
        .catch(function () { form.submit(); });
    });

    update();
  }

  function initGallery() {
    var gallery = document.querySelector("[data-gallery]");
    if (!gallery) return;
    var mainImg = gallery.querySelector("[data-gallery-main] img");
    var mediaImages = [].slice.call(gallery.querySelectorAll(".pdp__media-item img"));
    var fullSources = mediaImages.map(function (img) { return img.getAttribute("src") || img.src; });
    var strip = gallery.querySelector("[data-gallery-thumbs]");
    var thumbs = [].slice.call(gallery.querySelectorAll(".pdp__thumb"));
    var dots = [].slice.call(gallery.querySelectorAll(".pdp__dot"));
    var current = 0;
    var setActive = function (index) {
      index = Math.max(0, Math.min(thumbs.length - 1, index));
      current = index;
      thumbs.forEach(function (t, i) { t.classList.toggle("is-active", i === index); });
      dots.forEach(function (d, i) { d.classList.toggle("is-active", i === index); });
      var full = fullSources[index];
      if (full && mainImg) { mainImg.src = full; }
      if (strip && thumbs[index]) {
        var t = thumbs[index];
        var target = t.offsetLeft - (strip.clientWidth / 2) + (t.offsetWidth / 2);
        strip.scrollTo({ left: target, behavior: "smooth" });
      }
    };
    thumbs.forEach(function (t, i) { t.addEventListener("click", function () { setActive(i); }); });
    dots.forEach(function (d, i) { d.addEventListener("click", function () { setActive(i); }); });

    var main = gallery.querySelector("[data-gallery-main]");
    if (main) {
      var startX = 0, startY = 0, tracking = false;
      main.addEventListener("touchstart", function (e) {
        startX = e.touches[0].clientX; startY = e.touches[0].clientY; tracking = true;
      }, { passive: true });
      main.addEventListener("touchend", function (e) {
        if (!tracking) { return; }
        tracking = false;
        var dx = e.changedTouches[0].clientX - startX;
        var dy = e.changedTouches[0].clientY - startY;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
          setActive(dx < 0 ? current + 1 : current - 1);
        }
      }, { passive: true });
    }
  }

  function initSwatches() {
    document.querySelectorAll(".pdp__swatches .swatch").forEach(function (sw) {
      sw.addEventListener("click", function () {
        document.querySelectorAll(".pdp__swatches .swatch").forEach(function (s) {
          s.classList.remove("is-active");
          s.setAttribute("aria-checked", "false");
        });
        sw.classList.add("is-active");
        sw.setAttribute("aria-checked", "true");
      });
    });
  }

  function initShop() {
    var shopGrid = document.querySelector("[data-shop-grid]");
    if (!shopGrid) return;
    var cells = [].slice.call(shopGrid.querySelectorAll(".shop__cell"));
    var pageSize = 8;
    var activeType = "all";
    var visibleCount = pageSize;

    var shopApply = function () {
      var shown = 0;
      cells.forEach(function (cell) {
        var matches = activeType === "all" || cell.getAttribute("data-type") === activeType;
        if (matches && shown < visibleCount) { cell.hidden = false; shown++; }
        else { cell.hidden = true; }
      });
      var totalMatching = cells.filter(function (c) {
        return activeType === "all" || c.getAttribute("data-type") === activeType;
      }).length;
      var wrap = document.querySelector("[data-loadmore-wrap]");
      if (wrap) { wrap.toggleAttribute("data-exhausted", visibleCount >= totalMatching); }
      shopGrid.dispatchEvent(new CustomEvent("shop:changed")); // let the motion layer batch-reveal new cards
    };

    var types = document.querySelector("[data-shop-types]");
    // data-server-types = the tabs are real filter links handled in
    // initShopFilters; the client-side type filtering below must stay out of it.
    if (types && !types.hasAttribute("data-server-types")) {
      types.querySelectorAll(".shop__type").forEach(function (tab) {
        tab.addEventListener("click", function () {
          types.querySelectorAll(".shop__type").forEach(function (t) {
            t.classList.remove("is-active"); t.setAttribute("aria-selected", "false");
          });
          tab.classList.add("is-active"); tab.setAttribute("aria-selected", "true");
          activeType = tab.getAttribute("data-type");
          visibleCount = pageSize;
          shopApply();
        });
      });
    }

    // Filter dropdown. .is-filtering still carries the state (CSS needs it for
    // visibility and the no-motion path), but when GSAP is available the panel
    // and its groups are orchestrated by a timeline instead of CSS transitions.
    var filtersToggle = document.querySelector("[data-filters-toggle]");
    var shopSection = document.querySelector("[data-shop-section]");
    if (filtersToggle && shopSection) {
      var filtersLabel = filtersToggle.querySelector("[data-filters-label]");
      var filterTl = buildFilterTimeline(shopSection);
      var setFilters = function (open) {
        shopSection.classList.toggle("is-filtering", open);
        filtersToggle.setAttribute("aria-expanded", open ? "true" : "false");
        if (filtersLabel) { filtersLabel.textContent = open ? "Hide filters" : "Filters"; }
        if (filterTl) { filterTl.set(open); }
      };
      filtersToggle.addEventListener("click", function (e) {
        e.stopPropagation(); // don't let the outside-click handler undo this
        setFilters(!shopSection.classList.contains("is-filtering"));
      });

      // It's a dropdown now, so it should dismiss like one. Bound once on
      // document — initShop re-runs after every filtered swap, and a listener
      // per swap would pile up.
      shopFiltersClose = function () { setFilters(false); filtersToggle.focus(); };
      if (!filterDismissBound) {
        filterDismissBound = true;
        document.addEventListener("click", function (e) {
          var sec = document.querySelector("[data-shop-section]");
          if (!sec || !sec.classList.contains("is-filtering")) { return; }
          var panel = sec.querySelector("[data-filter-panel]");
          if (panel && panel.contains(e.target)) { return; }
          if (shopFiltersClose) { shopFiltersClose(); }
        });
        document.addEventListener("keydown", function (e) {
          var sec = document.querySelector("[data-shop-section]");
          if (e.key !== "Escape" || !sec || !sec.classList.contains("is-filtering")) { return; }
          if (shopFiltersClose) { shopFiltersClose(); }
        });
      }
      // Re-opened by initShopFilters after a filtered swap, so honour that here.
      if (shopSection.hasAttribute("data-filters-open")) { setFilters(true); }
    }

    var loadMoreBtn = document.querySelector(".shop__loadmore-btn");
    if (loadMoreBtn) {
      loadMoreBtn.addEventListener("click", function () {
        visibleCount += pageSize;
        shopApply();
      });
    }

    initShopFilters();
    shopApply();
  }

  // Orchestrated open/close for the filter dropdown. The panel eases open while
  // its groups stagger in behind it; closing runs the stagger from the far end
  // so the motion mirrors.
  //
  // GSAP 3.15's easeReverse would express this as one reversible timeline, but
  // we're pinned to 3.12.5 (3.15 broke the preloader counter and Lenis). So
  // instead of reverse()-ing a timeline — which would run power3.out backwards
  // as a power3.in and make the panel look like it falls shut — open and close
  // are separate tweens that each ease OUT, with overwrite handling interruption.
  function buildFilterTimeline(section) {
    if (!motionOn) { return null; } // CSS handles the no-motion / reduced-motion path
    var panel = section.querySelector("[data-filter-panel]");
    if (!panel) { return null; }
    var groups = [].slice.call(
      panel.querySelectorAll(".shop__filter-group, .shop__filter-actions, .shop__filter-note")
    );
    // The dropdown only exists at >=900px; below that the panel is an in-flow
    // block that CSS collapses on a grid row, which GSAP shouldn't touch.
    var mq = window.matchMedia("(min-width: 900px)");
    var targets = [panel].concat(groups);
    var primed = false;

    var prime = function () {
      gsap.set(panel, { autoAlpha: 0, y: -8 });
      if (groups.length) { gsap.set(groups, { autoAlpha: 0, y: 12 }); }
      primed = true;
    };

    return {
      set: function (open) {
        if (!mq.matches) {
          // Resized down to mobile — hand control back to CSS and clear anything
          // GSAP left inline, or the panel would sit stuck at its tweened values.
          if (primed) {
            gsap.killTweensOf(targets);
            gsap.set(targets, { clearProps: "all" });
            primed = false;
          }
          return;
        }
        if (!primed) { prime(); }

        if (open) {
          gsap.to(panel, { autoAlpha: 1, y: 0, duration: 0.4, ease: "power3.out", overwrite: true });
          if (groups.length) {
            gsap.to(groups, {
              autoAlpha: 1, y: 0, duration: 0.45, ease: "power2.out", overwrite: true,
              delay: 0.08, // let the panel start opening before its contents arrive
              stagger: { each: 0.06, from: "start" }
            });
          }
        } else {
          // Mirrored: contents leave from the far end first, panel follows.
          if (groups.length) {
            gsap.to(groups, {
              autoAlpha: 0, y: 12, duration: 0.3, ease: "power2.out", overwrite: true,
              stagger: { each: 0.04, from: "end" }
            });
          }
          gsap.to(panel, {
            autoAlpha: 0, y: -8, duration: 0.35, ease: "power3.out", overwrite: true,
            delay: groups.length ? 0.06 : 0
          });
        }
      }
    };
  }

  // Storefront filters. The panel is a real GET form (works with JS off); here we
  // intercept it, fetch the filtered collection URL and swap the whole .shop
  // section in, so the page doesn't reload and the filter panel stays open.
  function initShopFilters() {
    var section = document.querySelector("[data-shop-section]");
    if (!section) { return; }
    var form = document.querySelector("[data-filter-form]");

    var render = function (url, push) {
      // Preserve whatever the panel was doing: open stays open across a filter
      // change, closed stays closed when a type tab is what triggered this.
      var wasOpen = section.classList.contains("is-filtering");
      section.setAttribute("data-loading", "");
      return fetch(url)
        .then(function (res) { return res.ok ? res.text() : Promise.reject(res.status); })
        .then(function (text) {
          var parsed = document.createElement("div");
          parsed.innerHTML = text;
          var fresh = parsed.querySelector("[data-shop-section]");
          if (!fresh) { return; }
          section.innerHTML = fresh.innerHTML;
          if (push) { history.pushState({}, "", url); }
          // Flag before re-init so initShop restores the panel's prior state
          // rather than snapping it shut on every swap.
          if (wasOpen) {
            section.setAttribute("data-filters-open", "");
            section.classList.add("is-filtering");
          } else {
            section.removeAttribute("data-filters-open");
          }
          // Everything inside is new DOM, so re-bind from scratch. Old listeners
          // died with the markup they were attached to.
          initShop();
          initAccordions(); // filter groups are .accordion — new DOM needs re-binding
          revealInjected(section);
          if (motionOn) { ScrollTrigger.refresh(); }
        })
        .catch(function () { window.location.href = url; }) // fall back to a real navigation
        .then(function () { section.removeAttribute("data-loading"); });
    };

    var submit = function () {
      var params = new URLSearchParams(new FormData(form));
      // Drop empty price inputs so they don't become "filter.v.price.gte="
      var clean = new URLSearchParams();
      params.forEach(function (v, k) { if (v !== "") { clean.append(k, v); } });
      var qs = clean.toString();
      render(window.location.pathname + (qs ? "?" + qs : ""), true);
    };

    // The panel only exists once filters are configured in Search & Discovery;
    // the type tabs below work regardless.
    if (form) {
      // Without JS the form GETs here, which drops any existing filter params —
      // exactly what we want, since the checkboxes carry the full new state.
      form.setAttribute("action", window.location.pathname);
      // Filters are applied explicitly via the Apply button — no auto-apply on
      // change, or the button would be decorative and the grid would churn on
      // every checkbox. Enter inside the form submits it as usual.
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        submit();
      });

    }

    // Product-type tabs are plain filter links. preventDefault also stops the
    // page-transition router (it bails on defaultPrevented), so switching type
    // swaps the grid instead of playing a full-page sweep.
    section.querySelectorAll("[data-type-link]").forEach(function (tab) {
      tab.addEventListener("click", function (e) {
        e.preventDefault();
        render(tab.getAttribute("href"), true);
      });
    });

    // Matched by class — the button snippet renders the element, so it can't
    // carry a data- hook of its own.
    var clear = section.querySelector(".shop__filter-clear");
    if (clear) {
      clear.addEventListener("click", function (e) {
        e.preventDefault();
        if (clear.classList.contains("is-disabled")) { return; } // nothing to clear
        render(clear.getAttribute("href"), true);
      });
    }

    // Back/forward should move through filter states, not out of the page.
    // Bound once on window — initShopFilters re-runs after every swap, and a
    // listener per swap would stack up and fire render() repeatedly.
    shopFilterRender = render;
    if (!popstateBound) {
      popstateBound = true;
      window.addEventListener("popstate", function () {
        if (shopFilterRender) { shopFilterRender(window.location.href, false); }
      });
    }
  }
  var popstateBound = false;
  var shopFilterRender = null;
  var filterDismissBound = false;
  var shopFiltersClose = null;

  // Hero carousel — crossfades between multiple media slides. Inert for a single
  // slide (static hero). Videos autoplay muted/loop via markup. Respects reduced
  // motion (no auto-advance). Dots (if present) jump + restart the timer.
  function initHeroCarousel() {
    var wrap = document.querySelector("[data-hero-slides]");
    if (!wrap) { return; }
    var slides = wrap.querySelectorAll(".hero__slide");
    if (slides.length < 2) { return; } // single media = nothing to rotate
    var dots = document.querySelectorAll("[data-hero-dots] .hero__dot");
    var headline = document.querySelector("[data-hero-headline]");
    var idx = 0, timer = null, interval = 6000;
    var videoOf = function (slide) { return slide.querySelector("video.hero__media-el"); };
    // "Carry On." is the first slide's overlay only — hide it on every other slide.
    var syncHeadline = function () { if (headline) { headline.classList.toggle("is-hidden", idx !== 0); } };
    var clear = function () { if (timer) { clearTimeout(timer); timer = null; } };

    // A video slide plays once from the top and advances when it ends; every video
    // is unlooped (so `ended` fires) and paused off-screen — it only plays while
    // active. Image slides keep the fixed hold below.
    slides.forEach(function (slide) {
      var v = videoOf(slide);
      if (!v) { return; }
      v.loop = false;
      try { v.pause(); } catch (e) {}
      v.addEventListener("ended", function () { if (slides[idx] === slide) { go(idx + 1); } });
    });

    // Hold on the active slide, then advance: images time out after `interval`;
    // videos wait for their own `ended` (nothing to schedule here).
    var hold = function () {
      clear();
      if (reducedMotion || videoOf(slides[idx])) { return; }
      timer = setTimeout(function () { go(idx + 1); }, interval);
    };
    var play = function (v) {
      if (!v || reducedMotion) { return; }
      try { v.currentTime = 0; } catch (e) {}
      var p = v.play();
      if (p && p.catch) { p.catch(function () {}); }
    };
    var go = function (n) {
      var cur = videoOf(slides[idx]);
      if (cur) { try { cur.pause(); } catch (e) {} } // hold last frame through the fade
      slides[idx].classList.remove("is-active");
      if (dots[idx]) { dots[idx].classList.remove("is-active"); }
      idx = (n + slides.length) % slides.length;
      slides[idx].classList.add("is-active");
      if (dots[idx]) { dots[idx].classList.add("is-active"); }
      syncHeadline();
      play(videoOf(slides[idx])); // restart the video from the beginning on entry
      hold();
    };
    dots.forEach(function (dot, n) { dot.addEventListener("click", function () { go(n); }); });
    // Touch swipe (mobile): drag left → next, right → prev; pause auto-advance.
    var sx = null;
    wrap.addEventListener("touchstart", function (e) { sx = e.touches[0].clientX; clear(); }, { passive: true });
    wrap.addEventListener("touchend", function (e) {
      if (sx === null) { return; }
      var dx = e.changedTouches[0].clientX - sx;
      if (Math.abs(dx) > 40) { go(idx + (dx < 0 ? 1 : -1)); } else { hold(); }
      sx = null;
    }, { passive: true });
    play(videoOf(slides[idx])); // in case the first slide is a video
    hold();
  }

  // PDP accordions — smooth GSAP height + fade on expand/collapse, with the icon
  // rotating in sync. Native <details> stays the fallback when motion is off.
  // Single-open (accordion group): opening one collapses any open sibling, so the
  // sticky info column stays bounded.
  function initAccordions() {
    var accs = document.querySelectorAll(".accordion");
    if (!accs.length || !motionOn) { return; }

    var open = function (details, body) {
      details.open = true;
      details.classList.add("is-open");
      var full = body.scrollHeight;
      gsap.fromTo(body, { height: 0, opacity: 0 }, {
        height: full, opacity: 1, duration: 0.4, ease: "power2.out",
        onComplete: function () { body.style.height = "auto"; details._busy = false; }
      });
    };
    var close = function (details, body) {
      details.classList.remove("is-open");
      gsap.to(body, {
        height: 0, opacity: 0, duration: 0.35, ease: "power2.inOut",
        onComplete: function () { details.open = false; body.style.height = ""; body.style.opacity = ""; details._busy = false; }
      });
    };

    accs.forEach(function (details) {
      var summary = details.querySelector("summary");
      var body = details.querySelector(".accordion__body");
      if (!summary || !body) { return; }
      details._body = body;
      if (details.open) { details.classList.add("is-open"); }
      summary.addEventListener("click", function (e) {
        e.preventDefault();
        if (details._busy) { return; }
        if (!details.open) {
          // Single-open is a PDP behaviour, scoped to .pdp__accordions. Elsewhere
          // (e.g. the shop filter groups) accordions open independently.
          var group = details.closest(".pdp__accordions");
          if (group) {
            group.querySelectorAll(".accordion.is-open").forEach(function (other) {
              if (other !== details && !other._busy && other._body) {
                other._busy = true;
                close(other, other._body);
              }
            });
          }
          details._busy = true;
          open(details, body);
        } else {
          details._busy = true;
          close(details, body);
        }
      });
    });
  }

  /* ===================== Cart drawer ===================== */
  // Lives in the layout, so it survives every page. All cart mutations go through
  // the /cart/*.js endpoints, then we re-fetch the rendered section and swap its
  // markup in — that keeps money formatting and line-item logic in Liquid rather
  // than rebuilding it in JS.
  var cartDrawer = {
    open: function () {},
    refresh: function () { return Promise.resolve(); }
  };

  function initCartDrawer() {
    var root = document.querySelector("[data-cart-drawer]");
    if (!root) { return; }
    // The drawer lives in the layout, so it persists across page swaps. Its
    // listeners are delegated from this root — re-binding on every navigation
    // would stack them up.
    if (root.hasAttribute("data-cart-bound")) { return; }
    root.setAttribute("data-cart-bound", "");
    var lastFocus = null;

    var open = function () {
      lastFocus = document.activeElement;
      root.hidden = false;
      // next frame so the transition has a from-state to animate out of
      requestAnimationFrame(function () { root.classList.add("is-open"); });
      document.body.classList.add("has-cart-open");
      if (lenis) { lenis.stop(); }
      var closeBtn = root.querySelector(".cart-drawer__close");
      if (closeBtn) { closeBtn.focus(); }
    };

    var close = function () {
      root.classList.remove("is-open");
      document.body.classList.remove("has-cart-open");
      if (lenis) { lenis.start(); }
      var done = function () { root.hidden = true; };
      // hide only after the slide-out finishes, so it doesn't just vanish
      var panel = root.querySelector(".cart-drawer__panel");
      if (panel) { panel.addEventListener("transitionend", done, { once: true }); }
      else { done(); }
      if (lastFocus && lastFocus.focus) { lastFocus.focus(); }
    };

    // Pull the freshly rendered drawer and swap the panel's contents.
    var refresh = function () {
      return fetch(root.getAttribute("data-cart-section-url") || "/?sections=cart-drawer")
        .then(function (res) { return res.ok ? res.json() : Promise.reject(res.status); })
        .then(function (data) {
          var markup = data["cart-drawer"];
          if (!markup) { return; }
          var parsed = document.createElement("div");
          parsed.innerHTML = markup;
          var fresh = parsed.querySelector("[data-cart-panel]");
          var current = root.querySelector("[data-cart-panel]");
          if (fresh && current) { current.innerHTML = fresh.innerHTML; }
          syncCount(parsed);
        })
        .catch(function () {});
    };

    // Keep the header bag badge in step with the cart. The count comes off the
    // freshly rendered drawer root, so Liquid stays the single source of truth.
    var syncCount = function (parsed) {
      var fresh = parsed.querySelector("[data-cart-drawer]");
      if (!fresh) { return; }
      var count = parseInt(fresh.getAttribute("data-cart-item-count"), 10);
      if (isNaN(count)) { return; }
      root.setAttribute("data-cart-item-count", count);
      var link = document.querySelector("[data-cart-count]");
      if (link) { link.setAttribute("aria-label", "Bag (" + count + ")"); }
      var badge = document.querySelector("[data-cart-count-value]");
      if (badge) {
        badge.textContent = count;
        badge.hidden = count === 0; // an empty bag shows no badge at all
      }
    };

    // Delegated: the panel's contents are replaced wholesale on every refresh,
    // so per-element listeners would be lost each time.
    root.addEventListener("click", function (e) {
      if (e.target.closest("[data-cart-close]")) { close(); return; }

      var changeBtn = e.target.closest("[data-line-change]");
      if (!changeBtn) { return; }
      var row = changeBtn.closest("[data-line]");
      if (!row) { return; }
      changeBtn.disabled = true;
      fetch("/cart/change.js", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          line: parseInt(row.getAttribute("data-line"), 10),
          quantity: parseInt(changeBtn.getAttribute("data-line-change"), 10)
        })
      })
        .then(function (res) { return res.ok ? res.json() : Promise.reject(res.status); })
        .then(function () { return refresh(); })
        .catch(function () { changeBtn.disabled = false; });
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !root.hidden) { close(); }
    });

    // Header bag icon opens the drawer instead of navigating to /cart. The header
    // is outside <main>, so it survives page swaps — bind once or every navigation
    // would add another handler and fire refresh() repeatedly.
    var bagLink = document.querySelector("[data-cart-count]");
    if (bagLink && !bagLink.hasAttribute("data-cart-bound")) {
      bagLink.setAttribute("data-cart-bound", "");
      bagLink.addEventListener("click", function (e) {
        e.preventDefault();
        refresh().then(open);
      });
    }

    // /cart redirects here with #cart so the drawer opens on arrival.
    if (window.location.hash === "#cart") {
      history.replaceState(null, "", window.location.pathname + window.location.search);
      refresh().then(open);
    }

    cartDrawer.open = open;
    cartDrawer.refresh = refresh;
  }

  // PDP info column — the sticky panel should own the wheel only while it actually
  // has somewhere left to scroll. data-lenis-prevent is all-or-nothing (Lenis reads
  // it per event off the composed path), so we toggle it as the pointer scrolls:
  //   - content fits            -> released, the page scrolls normally (no dead zone)
  //   - content overflows       -> held, the panel scrolls inside
  //   - panel at its top/bottom -> released, so the page takes over from there
  // i.e. read the panel to the end, then keep going and the page continues.
  function initPdpScroll() {
    var info = document.querySelector(".pdp__info");
    if (!info) { return; }

    var EDGE = 2; // px tolerance — scrollTop lands on fractional values when zoomed

    // Only the desktop layout gives this column its own scroll box; on mobile it
    // is a normal block and must never capture the wheel.
    var scrollable = function () {
      var overflowY = window.getComputedStyle(info).overflowY;
      if (overflowY !== "auto" && overflowY !== "scroll") { return false; }
      return info.scrollHeight - info.clientHeight > EDGE;
    };

    var setPrevent = function (on) {
      if (on) { info.setAttribute("data-lenis-prevent", ""); }
      else { info.removeAttribute("data-lenis-prevent"); }
    };

    // Start released, so a short panel never traps the wheel even before the
    // first event lands.
    setPrevent(false);

    // Capture phase: this has to settle the attribute before Lenis's own
    // window-level handler reads it.
    window.addEventListener("wheel", function (e) {
      if (!info.contains(e.target)) { return; }
      if (!scrollable()) { setPrevent(false); return; }
      var atTop = info.scrollTop <= EDGE;
      var atBottom = info.scrollTop + info.clientHeight >= info.scrollHeight - EDGE;
      var down = e.deltaY > 0;
      setPrevent(!((down && atBottom) || (!down && atTop)));
    }, { capture: true, passive: true });

    // Touch can't tell us a direction up front, so we go by overflow alone. The
    // CSS overscroll-behavior: contain stops the panel chaining mid-swipe; lifting
    // and swiping again moves the page.
    window.addEventListener("touchstart", function (e) {
      if (!info.contains(e.target)) { return; }
      setPrevent(scrollable());
    }, { capture: true, passive: true });
  }

  // "You might also like" — Shopify only fills the `recommendations` object on the
  // /recommendations/products route, so the section ships empty and we pull the
  // rendered markup in here. Silent on failure: the shell is already empty, so a
  // dead request just means no section, never a broken one.
  function initRecommendations() {
    var host = document.querySelector("[data-product-recommendations]");
    if (!host || !host.dataset.url) { return; }

    var load = function () {
      fetch(host.dataset.url)
        .then(function (res) { return res.ok ? res.text() : Promise.reject(res.status); })
        .then(function (text) {
          var parsed = document.createElement("div");
          parsed.innerHTML = text;
          var fresh = parsed.querySelector("[data-product-recommendations]");
          if (!fresh || !fresh.innerHTML.trim()) { return; } // no recommendations for this product
          host.innerHTML = fresh.innerHTML;
          revealInjected(host);
          applyHeaderTheme(); // the new section carries its own data-section-theme
          if (motionOn) { ScrollTrigger.refresh(); }
        })
        .catch(function () {});
    };

    // Defer until the shell is near the viewport — it sits below the fold, so this
    // keeps the request off the critical path on first paint.
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting) { return; }
        io.disconnect();
        load();
      }, { rootMargin: "600px" });
      io.observe(host);
    } else {
      load();
    }
  }

  // Animate .reveal elements added to the DOM after buildMainMotion already ran.
  // Without this they keep the has-gsap initial state (opacity 0) and never show.
  function revealInjected(root) {
    if (!motionOn) { return; } // no has-gsap hiding to undo
    gsap.utils.toArray(root.querySelectorAll(".reveal")).forEach(function (el) {
      gsap.to(el, {
        opacity: 1, y: 0, duration: 0.9, ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 88%" }
      });
    });
  }

  function initFeatures() {
    initQty();
    initGallery();
    initProductForm(); // Shopify variant-aware swatches (replaces the cosmetic initSwatches)
    initShop();
    initHeroCarousel();
    initAccordions();
    initCartDrawer();
    initPdpScroll();
    initRecommendations();
  }

  /* ===================== Motion layer ===================== */
  var lenis = null;
  var motionOn = hasGsap && !reducedMotion;

  if (motionOn) {
    docEl.classList.add("has-gsap");
    gsap.registerPlugin(ScrollTrigger);

    if (typeof Lenis !== "undefined") {
      lenis = new Lenis({ lerp: 0.12, wheelMultiplier: 1 });
      lenis.on("scroll", function () { ScrollTrigger.update(); updateHeaderTheme(); });
      gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
      gsap.ticker.lagSmoothing(0);
    }

    // Footer closer lives outside <main> (persistent) — set up once.
    var closer = document.querySelector("[data-closer]");
    if (closer) {
      gsap.from(closer, {
        y: 60, opacity: 0, duration: 1, ease: "power3.out",
        scrollTrigger: { trigger: closer, start: "top 92%" }
      });
    }
  }

  // Motion that belongs to <main>. Scoped in a gsap.context so a page swap can
  // revert it (kills its tweens + ScrollTriggers, restores inline styles).
  var mainCtx = null;
  // Split a heading into line wrappers (overflow-hidden) each holding an inner
  // span, for a mask-up reveal. Preserves the red span's colour and keeps
  // non-breaking-space word groups intact. Returns the inner spans (to animate).
  function splitHeadingLines(heading) {
    var tokens = [];
    [].forEach.call(heading.childNodes, function (node) {
      if (node.nodeName === "BR") { tokens.push({ brk: true }); return; } // explicit forced break
      var red = node.nodeType === 1 && node.classList && node.classList.contains("text-brand");
      (node.textContent || "").split(" ").forEach(function (w) { if (w.length) { tokens.push({ w: w, red: red }); } });
    });
    heading.textContent = "";
    var breakBefore = false;
    var words = tokens.reduce(function (acc, t) {
      // A real <br> here makes the offsetTop measurement below reflect the forced
      // break (so the following words fit/flow on their own line), and the flag is a
      // belt-and-suspenders in case the two sides happen to share an offsetTop.
      if (t.brk) { heading.appendChild(document.createElement("br")); breakBefore = true; return acc; }
      var s = document.createElement("span");
      s.textContent = t.w;
      if (t.red) { s.className = "text-brand"; }
      s.style.display = "inline-block";
      if (breakBefore) { s.dataset.brk = "1"; breakBefore = false; }
      heading.appendChild(s);
      heading.appendChild(document.createTextNode(" "));
      acc.push(s);
      return acc;
    }, []);
    // Group words into visual lines by their rendered top, but always start a new
    // line at a word flagged with an explicit break (from a <br> in the source).
    var groups = [], top = null;
    words.forEach(function (s) {
      var t = s.offsetTop;
      if (top === null || Math.abs(t - top) > 4 || s.dataset.brk) { groups.push([]); top = t; }
      groups[groups.length - 1].push(s);
    });
    heading.textContent = "";
    var inners = [];
    groups.forEach(function (group) {
      var line = document.createElement("span"); line.className = "brand-intro__line";
      var inner = document.createElement("span"); inner.className = "brand-intro__line-inner";
      group.forEach(function (s, i) {
        inner.appendChild(s);
        if (i < group.length - 1) { inner.appendChild(document.createTextNode(" ")); }
      });
      line.appendChild(inner);
      heading.appendChild(line);
      inners.push(inner);
    });
    return inners;
  }

  function buildMainMotion() {
    pageRevealHooks = []; // fresh per build; fired when the cover lifts

    // Hero headline rises out of a mask (like the intro logo), held hidden until
    // the cover lifts so it's always seen. The active slide's image scales in.
    var heroHeadline = document.querySelector("[data-hero-headline]");
    if (heroHeadline) {
      var heroInner = heroHeadline.querySelector(".hero__headline-inner");
      var heroImg = document.querySelector(".hero__slide.is-active .hero__media-el");
      if (heroImg && heroImg.tagName === "IMG") { gsap.from(heroImg, { scale: 1.08, duration: 1.8, ease: "power2.out" }); }
      if (heroInner) {
        gsap.set(heroInner, { yPercent: 110 });
        pageRevealHooks.push(function () {
          // Hold on the empty hero for a beat before the headline rises (dramatic).
          gsap.to(heroInner, { yPercent: 0, duration: 1.0, ease: "power3.out", delay: 2 });
        });
      }
    }

    // Brand intro — the hero holds while section 2 rises up and buries it, then
    // section 2 reveals its content. Desktop pins the hero + intro "stack" and
    // scrubs: Phase 1 cover (panel slides up, hero eases back — dims + scales),
    // Phase 2 reveal (media clip, headline masking up line-by-line, body + button).
    // Mobile skips the cover and just reveals section 2 on enter.
    var brand = document.querySelector(".brand-intro");
    if (brand) {
      var stack = document.querySelector(".intro-stack");
      var hero = document.querySelector(".hero");
      var biMedia = brand.querySelector(".brand-intro__media");
      var biImg = biMedia && biMedia.querySelector("img");
      var biHeading = brand.querySelector(".brand-intro__heading");
      var biHeadingHTML = biHeading ? biHeading.innerHTML : "";
      var biBody = brand.querySelector(".brand-intro__body");
      var biCta = brand.querySelector(".brand-intro__cta");

      // Re-split the headline into masked lines (fresh DOM after any swap/resize).
      var biReset = function () {
        var lines = [];
        if (biHeading) {
          biHeading.innerHTML = biHeadingHTML;
          lines = splitHeadingLines(biHeading);
          biHeading.style.visibility = "visible"; // lines start masked, so no flash
        }
        if (lines.length) { gsap.set(lines, { yPercent: 115 }); }
        return lines;
      };
      // Append the content reveal (Phase 2) to a timeline starting at time `at`.
      // opts.fadeMedia: fade the image in instead of wiping it (the clip-path wipe
      // reads as a glitch on mobile's enter-trigger, so mobile uses a plain fade).
      var biReveal = function (tl, lines, at, opts) {
        opts = opts || {};
        if (biMedia) {
          // Reset the CSS initial clip (inset(100%)) open — mobile reveals via opacity,
          // not the wipe, so without this the media stays fully clipped and invisible.
          if (opts.fadeMedia) { tl.fromTo(biMedia, { opacity: 0, clipPath: "inset(0% 0% 0% 0%)" }, { opacity: 1, duration: 0.7, ease: "power2.out" }, at); }
          else { tl.fromTo(biMedia, { clipPath: "inset(100% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.8, ease: "power2.out" }, at); }
        }
        if (biImg) { tl.fromTo(biImg, { scale: 1.18 }, { scale: 1, duration: 1.1, ease: "none" }, at); }
        if (lines.length) { tl.to(lines, { yPercent: 0, duration: 0.7, stagger: 0.12, ease: "power3.out" }, at + 0.15); }
        if (biBody) { tl.fromTo(biBody, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" }, at + 0.45); }
        if (biCta) { tl.fromTo(biCta, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" }, at + 0.6); }
      };

      var biMM = gsap.matchMedia();
      // Desktop: pin the stack, cover the hero (with hero easing back), then reveal.
      biMM.add("(min-width: 900px)", function () {
        if (!stack || !hero) { return; }
        var lines = biReset();
        var tl = gsap.timeline({
          scrollTrigger: { trigger: stack, start: "top top", end: "+=220%", pin: true, scrub: 0.5, anticipatePin: 1 }
        });
        tl.fromTo(brand, { yPercent: 100 }, { yPercent: 0, duration: 1, ease: "power2.inOut" }, 0)
          .fromTo(hero, { scale: 1, filter: "brightness(1)" }, { scale: 0.93, filter: "brightness(0.5)", duration: 1, ease: "power2.inOut" }, 0);
        // Begin the content reveal once the white panel covers ~50% of the viewport
        // (yPercent 50, i.e. halfway through Phase 1) so the section is never a blank
        // white sheet — the content rises in as the panel finishes covering the hero.
        biReveal(tl, lines, 0.5);
      });
      // Mobile: the hero is sticky (CSS) and section 2 rises over it on native
      // scroll. We scrub a darken + subtle recede on the hero as it's covered, and
      // reveal section 2's content as it rises into place.
      biMM.add("(max-width: 899px)", function () {
        var lines = biReset();
        var tl = gsap.timeline({ scrollTrigger: { trigger: brand, start: "top 70%" } });
        biReveal(tl, lines, 0, { fadeMedia: true });
        // Mobile: dim only (no scale — scaling the sticky hero glitches on some
        // phones). The shrink stays a desktop-only effect.
        var heroCover = document.querySelector(".hero__cover");
        if (heroCover) {
          gsap.fromTo(heroCover, { opacity: 0 }, {
            opacity: 0.6, ease: "none",
            scrollTrigger: { trigger: brand, start: "top bottom", end: "top top", scrub: true }
          });
        }
      });
    }

    // Categories — desktop pins the section as a 100vh frame; the cards fly in from
    // off-screen right ONE AT A TIME (staggered), each decelerating to a stop in its
    // aligned slot, then the finished grid holds briefly before unpinning. So the
    // section always unpins on the clean grid, never mid-motion. Mobile settles upward.
    var catCards = gsap.utils.toArray(".categories .category-card");
    if (catCards.length) {
      var catSection = document.querySelector(".categories");
      var catMM = gsap.matchMedia();
      catMM.add("(min-width: 900px)", function () {
        var vw = function () { return catSection.clientWidth; };
        var vh = function () { return window.innerHeight; };
        // Pin the 100vh frame. This trigger ONLY holds the section in place — the card
        // motion lives on its own trigger (below) so it can begin before the pin does.
        ScrollTrigger.create({
          trigger: catSection, start: "top top",
          end: function () { return "+=" + Math.round(vw() * 1.5); },
          pin: true, anticipatePin: 1, invalidateOnRefresh: true
        });
        // Cards — one scrubbed timeline that spans the section's rise into view AND the
        // pinned frame, so the white panel is never a blank sheet as it climbs. The
        // staggered fly-in starts as the section passes 50% of the viewport ("top
        // center") and finishes inside the pin. Because a single trigger owns the card
        // x across both phases, the rise and the settle can't fight over the transform.
        var tl = gsap.timeline({
          scrollTrigger: {
            trigger: catSection, start: "top center",
            end: function () { return "+=" + Math.round(vh() * 0.5 + vw() * 1.5); },
            scrub: 0.6, invalidateOnRefresh: true
          }
        });
        // Each card starts one viewport to the right (off-screen) and eases to its
        // slot; stagger separates them so they arrive left-to-right, overlapping so
        // the next card starts entering once the previous is CAT_OVERLAP_AT of the
        // way to its slot. With power2.out (1-(1-t)^2), progress hits that fraction
        // at t = 1-sqrt(1-CAT_OVERLAP_AT) of its own duration — earlier than
        // CAT_OVERLAP_AT of duration, since the ease front-loads the motion.
        var CAT_OVERLAP_AT = 0.35; // lower = next card enters sooner (more overlap)
        var catCardDuration = 1;
        var catCardStagger = catCardDuration * (1 - Math.sqrt(1 - CAT_OVERLAP_AT));
        tl.fromTo(catCards,
          { x: function () { return vw(); } },
          { x: 0, ease: "power2.out", duration: catCardDuration, stagger: catCardStagger })
          // Hold on the completed grid so it never unpins mid-motion.
          .to({}, { duration: 0.25 });
      });
      // Mobile: gentle upward settle as each card enters.
      catMM.add("(max-width: 899px)", function () {
        catCards.forEach(function (card) {
          var img = card.querySelector(".category-card__image img");
          var tl = gsap.timeline({ scrollTrigger: { trigger: card, start: "top 85%" } });
          tl.fromTo(card, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" }, 0);
          if (img) { tl.fromTo(img, { scale: 1.12 }, { scale: 1, duration: 1.1, ease: "power2.out" }, 0); }
        });
      });
    }

    // Black Series — desktop pins the full-screen gray section; the bags slide in
    // from off-screen right ONE AT A TIME (left→right: Athena→Apollo) into their
    // overlapped lineup, then the heading fades in, the subtext after, and finally
    // the CTA rises out of a mask (like the intro logo). Mobile: fade-up, no pin.
    var bsSection = document.querySelector(".black-series");
    if (bsSection) {
      var bsBags = gsap.utils.toArray(".black-series__bag");
      var bsHeading = bsSection.querySelector(".black-series__heading");
      var bsSub = bsSection.querySelector(".black-series__sub");
      var bsCta = bsSection.querySelector(".black-series__cta .btn");
      var bsMM = gsap.matchMedia();
      bsMM.add("(min-width: 900px)", function () {
        var vw = function () { return bsSection.clientWidth; };
        var tl = gsap.timeline({
          scrollTrigger: {
            trigger: bsSection, start: "top top",
            end: function () { return "+=" + Math.round(vw() * 1.6); },
            pin: true, scrub: 0.6, anticipatePin: 1, invalidateOnRefresh: true
          }
        });
        // Bags fly in from off-screen right, staggered so the next bag starts entering
        // once the previous is BS_OVERLAP_AT of the way to its slot (same math as the
        // categories cards — see theme.js's categories section for the derivation).
        var BS_OVERLAP_AT = 0.35; // lower = next bag enters sooner (more overlap)
        var bsBagDuration = 1;
        var bsBagStagger = bsBagDuration * (1 - Math.sqrt(1 - BS_OVERLAP_AT));
        var bsBagsEnd = bsBagDuration + bsBagStagger * (bsBags.length - 1);
        tl.fromTo(bsBags, { x: function () { return vw(); } },
          { x: 0, ease: "power2.out", duration: bsBagDuration, stagger: bsBagStagger }, 0);
        // Heading, then subtext — timed relative to when the bags finish, since that
        // point now moves with the (shorter) overlapped stagger above.
        if (bsHeading) { tl.fromTo(bsHeading, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }, bsBagsEnd + 0.1); }
        if (bsSub) { tl.fromTo(bsSub, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }, bsBagsEnd + 0.5); }
        // CTA rises out of its mask last.
        if (bsCta) { tl.fromTo(bsCta, { yPercent: 110 }, { yPercent: 0, duration: 0.6, ease: "power3.out" }, bsBagsEnd + 0.9); }
        // Hold on the finished composition before unpin.
        tl.to({}, { duration: 0.3 });
      });
      bsMM.add("(max-width: 899px)", function () {
        if (bsBags.length) {
          gsap.fromTo(bsBags, { opacity: 0, y: 30 }, {
            opacity: 1, y: 0, duration: 0.8, ease: "power3.out", stagger: 0.12,
            scrollTrigger: { trigger: bsSection, start: "top 72%" }
          });
        }
        [bsHeading, bsSub].forEach(function (el, i) {
          if (!el) { return; }
          gsap.fromTo(el, { opacity: 0, y: 20 }, {
            opacity: 1, y: 0, duration: 0.6, ease: "power3.out", delay: 0.12 * i,
            scrollTrigger: { trigger: bsSection, start: "top 58%" }
          });
        });
        if (bsCta) {
          gsap.fromTo(bsCta, { yPercent: 110 }, {
            yPercent: 0, duration: 0.6, ease: "power3.out",
            scrollTrigger: { trigger: bsSection, start: "top 52%" }
          });
        }
      });
    }

    // Affiliate strip — a compact invitation band. The brand rule draws across,
    // the eyebrow fades, the heading masks up line-by-line, the sub fades, and the
    // CTA rises out of its mask (the signature move from the intro + Black Series).
    // Reveals once on enter.
    var aff = document.querySelector(".affiliate");
    if (aff) {
      var affRule = aff.querySelector(".affiliate__rule");
      var affLabel = aff.querySelector(".affiliate__eyebrow-label");
      var affHeading = aff.querySelector(".affiliate__heading");
      var affSub = aff.querySelector(".affiliate__sub");
      var affCta = aff.querySelector(".affiliate__cta .btn");
      var affLines = affHeading ? splitHeadingLines(affHeading) : [];
      if (affHeading) { affHeading.style.visibility = "visible"; } // lines start masked
      if (affLines.length) { gsap.set(affLines, { yPercent: 115 }); }

      var affTl = gsap.timeline({ scrollTrigger: { trigger: aff, start: "top 75%" } });
      if (affRule) { affTl.fromTo(affRule, { scaleX: 0 }, { scaleX: 1, duration: 0.6, ease: "power3.out" }, 0); }
      if (affLabel) { affTl.fromTo(affLabel, { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: 0.5, ease: "power2.out" }, 0.1); }
      if (affLines.length) { affTl.to(affLines, { yPercent: 0, duration: 0.7, stagger: 0.12, ease: "power3.out" }, 0.2); }
      if (affSub) { affTl.fromTo(affSub, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" }, 0.5); }
      if (affCta) { affTl.fromTo(affCta, { yPercent: 110 }, { yPercent: 0, duration: 0.6, ease: "power3.out" }, 0.6); }
    }

    // Lifestyle tiles — ScrollTrigger.batch groups the tiles that enter the
    // viewport together and staggers each batch in. Works for the 2-col (mobile)
    // and 3-col (desktop) grids alike, no per-row math. Reveals once.
    var lifestyleTiles = gsap.utils.toArray(".lifestyle-tile.reveal");
    if (lifestyleTiles.length) {
      ScrollTrigger.batch(lifestyleTiles, {
        start: "top 88%",
        onEnter: function (batch) {
          gsap.to(batch, { opacity: 1, y: 0, duration: 0.9, ease: "power3.out", stagger: 0.14, overwrite: true });
        }
      });
    }

    document.querySelectorAll(".reveal:not(.lifestyle-tile)").forEach(function (el) {
      if (el.closest("[data-shop-grid]")) { return; } // shop cards are batch-revealed below
      gsap.to(el, {
        opacity: 1, y: 0, duration: 0.9, ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 88%" }
      });
    });

    // Shop grid — stagger the product cards in with ScrollTrigger.batch (same idea
    // as the lifestyle tiles). Re-batches when the visible set changes (filter /
    // load-more, via the "shop:changed" event). Reuses the .reveal initial state;
    // each card reveals once (tracked with data-revealed).
    var shopGrid = document.querySelector("[data-shop-grid]");
    if (shopGrid) {
      var shopBatch = [];
      var revealShop = function () {
        shopBatch.forEach(function (st) { st.kill(); });
        shopBatch = [];
        var pending = gsap.utils.toArray(shopGrid.querySelectorAll(".shop__cell:not([hidden]) .product-card"))
          .filter(function (card) { return !card.dataset.revealed; });
        if (!pending.length) { return; }
        shopBatch = ScrollTrigger.batch(pending, {
          start: "top 92%",
          onEnter: function (batch) {
            batch.forEach(function (card) { card.dataset.revealed = "1"; });
            gsap.to(batch, { opacity: 1, y: 0, duration: 0.6, ease: "power3.out", stagger: 0.08, overwrite: true });
          }
        });
      };
      pageRevealHooks.push(revealShop); // initial batch waits for the cover to lift
      shopGrid.addEventListener("shop:changed", function () { revealShop(); ScrollTrigger.refresh(); });
    }

    var parallax = document.querySelector("[data-parallax]");
    if (parallax) {
      gsap.fromTo(parallax, { yPercent: -8 }, {
        yPercent: 8, ease: "none",
        scrollTrigger: { trigger: parallax.parentElement, start: "top bottom", end: "bottom top", scrub: true }
      });
    }
  }

  function initMainMotion() {
    if (!motionOn) return;
    if (mainCtx) mainCtx.revert();
    mainCtx = gsap.context(buildMainMotion);
    ScrollTrigger.refresh();
  }

  function initMain() {
    initFeatures();
    initMainMotion();
    applyHeaderTheme();
  }

  // First load.
  initMain();

  /* ===================== Client-side transition router ===================== */
  // Fetch the next page and swap <main> in place — the overlay/header/footer
  // never leave the document, so there is no navigation repaint (no flicker).
  // Shopify notes:
  //  - Disabled inside the theme editor: designMode re-renders sections into the
  //    live DOM and a swapped <main> desyncs the editor's preview.
  //  - Shopify-owned paths (checkout, account, apps, proxies) always hard-navigate;
  //    they aren't our templates and must not be pulled into <main>.
  var isDesignMode = !!(window.Shopify && window.Shopify.designMode);
  // Paths Shopify serves itself — never swap these in.
  // /cart is included deliberately: its template carries an inline redirect
  // script, and scripts inside a DOM-parsed swap never execute.
  var hardNavPath = /^\/(checkout|checkouts|cart|account|orders|apps|tools|services|community|password|challenge|a|wpm)(\/|$)/;
  var fileLike = /\.(pdf|jpe?g|png|gif|webp|svg|zip|csv|xlsx?|docx?|mp4|mp3)$/i;

  if (canIntro && !isDesignMode) {
    var navigating = false;
    var lightTurn = false; // alternates each transition; false = orange, true = white
    var currentPath = window.location.pathname;
    // We manage scroll ourselves; stop the browser restoring it under the cover.
    if ("scrollRestoration" in history) { history.scrollRestoration = "manual"; }

    var coverAnim = function () {
      // Grow up from the bottom, THEN slide the logo up into its mask window
      // (it rises in from below), then a brief hold.
      return new Promise(function (resolve) {
        gsap.timeline({ onComplete: resolve })
          .set(intro, { display: "flex", clipPath: "inset(100% 0% 0% 0%)" })
          .set(introMark, { yPercent: 110 })
          .to(intro, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.65, ease: "power2.inOut" })
          .to(introMark, { yPercent: 0, duration: 0.6, ease: "power3.out" })
          .to({}, { duration: 0.25 });
      });
    };

    var revealAnim = function () {
      // Sweep the whole panel up off the top to reveal the swapped-in page.
      return new Promise(function (resolve) {
        gsap.timeline({ onComplete: resolve })
          .set(intro, { clipPath: "inset(0% 0% 0% 0%)" })
          .to(intro, { clipPath: "inset(0% 0% 100% 0%)", duration: 0.85, ease: "power2.inOut", delay: 0.25 });
      });
    };

    var nextFrame = function () {
      // Two rAFs → the swapped content has laid out & painted behind the orange
      // before we reveal it, so we never sweep to a blank/unstyled frame.
      return new Promise(function (resolve) {
        requestAnimationFrame(function () { requestAnimationFrame(resolve); });
      });
    };

    var swapContent = function (html, href, isPop) {
      var doc = new DOMParser().parseFromString(html, "text/html");
      var newMain = doc.querySelector("main");
      var curMain = document.querySelector("main");
      if (!newMain || !curMain) { return false; }
      curMain.replaceWith(newMain);
      if (doc.title) { document.title = doc.title; }
      document.body.className = doc.body.className; // per-page template class
      if (!isPop) { history.pushState({ sassi: 1 }, "", href); }
      currentPath = new URL(href, window.location.href).pathname;
      window.scrollTo(0, 0);
      if (lenis) { lenis.scrollTo(0, { immediate: true }); }
      initMain();
      trackPageView(href);
      return true;
    };

    // A swapped <main> never triggers a document load, so Shopify's analytics
    // would only ever record the entry page. Nudge it manually; wrapped because
    // this is an undocumented internal that can move.
    var trackPageView = function (href) {
      try {
        if (window.ShopifyAnalytics && window.ShopifyAnalytics.lib && window.ShopifyAnalytics.lib.page) {
          window.ShopifyAnalytics.lib.page(null, { path: new URL(href, window.location.href).pathname });
        }
      } catch (e) {}
    };

    var navigate = function (href, isPop) {
      if (navigating) { return; }
      navigating = true;
      // Alternate the colour scheme each time (orange → white → orange …).
      intro.classList.toggle("page-intro--light", lightTurn);
      lightTurn = !lightTurn;
      intro.classList.remove("is-done");
      var fetchP = fetch(href, { credentials: "same-origin" }).then(function (r) {
        if (!r.ok) { throw new Error("HTTP " + r.status); }
        return r.text();
      });
      // Rule 1 + Rule 2: reveal only once the cover has fully played AND the new
      // page has arrived. A slow fetch just makes the orange linger.
      Promise.all([coverAnim(), fetchP]).then(function (out) {
        if (!swapContent(out[1], href, isPop)) {
          window.location.href = href; // couldn't parse — fall back to a hard load
          return;
        }
        return nextFrame().then(function () {
          firePageReveal(); // play the page's on-load reveals as the panel sweeps up
          return revealAnim();
        }).then(function () {
          intro.classList.add("is-done");
          navigating = false;
        });
      }).catch(function () {
        window.location.href = href; // network/parse failure — hard navigate
      });
    };

    document.addEventListener("click", function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) { return; }
      var a = e.target.closest ? e.target.closest("a[href]") : null;
      if (!a || (a.target && a.target !== "_self") || a.hasAttribute("download")) { return; }
      if (a.hasAttribute("data-no-transition")) { return; }
      var url;
      try { url = new URL(a.getAttribute("href"), window.location.href); } catch (err) { return; }
      if (url.origin !== window.location.origin) { return; }              // external
      if (url.protocol !== "http:" && url.protocol !== "https:") { return; } // mailto/tel/etc.
      if (hardNavPath.test(url.pathname)) { return; }  // Shopify-owned, not our template
      if (fileLike.test(url.pathname)) { return; }     // asset/download, not a page
      // Same document (only a hash or nothing changes) → let the browser handle it.
      if (url.pathname === window.location.pathname && url.search === window.location.search) { return; }
      e.preventDefault();
      navigate(url.href, false);
    });

    // Animated back/forward between pages.
    window.addEventListener("popstate", function () {
      if (navigating) { return; }
      if (window.location.pathname === currentPath) { return; } // same page (hash) — ignore
      navigate(window.location.href, true);
    });

    // Ensure this page has a state entry so the first Back is well-defined.
    try { history.replaceState({ sassi: 1 }, "", window.location.href); } catch (e) {}
  }
})();
