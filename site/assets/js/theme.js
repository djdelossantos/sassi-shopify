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

    // Auto-hide on scroll down, reveal on scroll up (mobile-only in CSS)
    var lastY = window.scrollY;
    window.addEventListener("scroll", function () {
      var y = window.scrollY;
      if (header.classList.contains("is-open")) { lastY = y; return; }
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
    qty.querySelector("[data-qty-minus]").addEventListener("click", function () {
      value.textContent = Math.max(1, parseInt(value.textContent, 10) - 1);
    });
    qty.querySelector("[data-qty-plus]").addEventListener("click", function () {
      value.textContent = parseInt(value.textContent, 10) + 1;
    });
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
    };

    var types = document.querySelector("[data-shop-types]");
    if (types) {
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

    var filtersToggle = document.querySelector("[data-filters-toggle]");
    var filterPanel = document.querySelector("[data-filter-panel]");
    if (filtersToggle && filterPanel) {
      filtersToggle.addEventListener("click", function () {
        var open = filterPanel.hasAttribute("hidden");
        filterPanel.toggleAttribute("hidden", !open);
        filtersToggle.setAttribute("aria-expanded", open ? "true" : "false");
      });
    }

    var loadMoreBtn = document.querySelector(".shop__loadmore-btn");
    if (loadMoreBtn) {
      loadMoreBtn.addEventListener("click", function () {
        visibleCount += pageSize;
        shopApply();
      });
    }

    shopApply();
  }

  function initFeatures() {
    initQty();
    initGallery();
    initSwatches();
    initShop();
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
  function buildMainMotion() {
    var heroHeadline = document.querySelector("[data-hero-headline]");
    if (heroHeadline) {
      gsap.from(heroHeadline, { y: 40, opacity: 0, duration: 1.1, ease: "power3.out", delay: 0.15 });
      var heroImg = document.querySelector(".hero__media img");
      if (heroImg) { gsap.from(heroImg, { scale: 1.08, duration: 1.8, ease: "power2.out" }); }
    }

    var lifestyleTiles = gsap.utils.toArray(".lifestyle-tile.reveal");
    if (lifestyleTiles.length) {
      var lifestyleRows = function (columns) {
        for (var i = 0; i < lifestyleTiles.length; i += columns) {
          var row = lifestyleTiles.slice(i, i + columns);
          gsap.to(row, {
            opacity: 1, y: 0, duration: 0.9, ease: "power3.out", stagger: 0.18,
            scrollTrigger: { trigger: row[0], start: "top 88%" }
          });
        }
      };
      var lifestyleMedia = gsap.matchMedia();
      lifestyleMedia.add("(min-width: 900px)", function () { lifestyleRows(3); });
      lifestyleMedia.add("(max-width: 899px)", function () { lifestyleRows(2); });
    }

    document.querySelectorAll(".reveal:not(.lifestyle-tile)").forEach(function (el) {
      gsap.to(el, {
        opacity: 1, y: 0, duration: 0.9, ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 88%" }
      });
    });

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
  if (canIntro) {
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
      return true;
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
        return nextFrame().then(revealAnim).then(function () {
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
