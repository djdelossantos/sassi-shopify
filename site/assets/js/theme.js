/* SASSi theme JS — Lenis smooth scroll + GSAP ScrollTrigger animations.
   Framework-free; drops into a Shopify theme's assets unchanged. */
(function () {
  "use strict";

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Interactions that always run ---------- */

  // Header contrast: flip content colour to suit the section under the header.
  // Runs regardless of reduced-motion — this is legibility, not decoration.
  var header = document.querySelector("[data-header]");
  var updateHeaderTheme = function () {};
  if (header) {
    var groups = [
      header.querySelector(".site-header__left"),
      header.querySelector(".site-header__logo"),
      header.querySelector(".site-header__icons")
    ].filter(Boolean);

    // Topmost tagged ancestor at a viewport point, ignoring the header itself.
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

    // Find, in %, how far across a box the dark region reaches. Binary search
    // so a straddling element resolves in ~7 samples instead of scanning.
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
    var apply = function () {
      raf = 0;
      var y = header.offsetHeight * 0.5; // header's own midline
      var allDark = true;
      for (var i = 0; i < groups.length; i++) {
        var r = groups[i].getBoundingClientRect();
        // Sample both edges and the centre; any dark sample wins so dark-on-dark
        // never happens for the text groups.
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
      // Scrim only when the whole bar is over dark content; over a white or
      // mixed section it would read as a grey wash.
      header.classList.toggle("site-header--no-scrim", !allDark);
    };

    updateHeaderTheme = function () {
      if (!raf) raf = requestAnimationFrame(apply);
    };
    apply();
    window.addEventListener("scroll", updateHeaderTheme, { passive: true });
    window.addEventListener("resize", updateHeaderTheme);
  }

  // Mobile menu: burger expands the bar into a full-screen drawer
  var menuToggle = document.querySelector("[data-menu-toggle]");
  if (header && menuToggle) {
    menuToggle.addEventListener("click", function () {
      var open = header.classList.toggle("is-open");
      menuToggle.setAttribute("aria-expanded", open ? "true" : "false");
      menuToggle.setAttribute("aria-label", open ? "Close menu" : "Menu");
      document.body.classList.toggle("has-menu-open", open);
      if (open) header.classList.remove("site-header--hidden");
    });
    // Close on navigation to an in-page anchor
    header.querySelectorAll(".site-header__drawer a").forEach(function (a) {
      a.addEventListener("click", function () {
        header.classList.remove("is-open");
        document.body.classList.remove("has-menu-open");
        menuToggle.setAttribute("aria-expanded", "false");
        menuToggle.setAttribute("aria-label", "Menu");
      });
    });
  }

  // Auto-hide on scroll down, reveal on scroll up. The transform itself is
  // mobile-only in CSS, so this is harmless on desktop.
  if (header) {
    var lastY = window.scrollY;
    window.addEventListener("scroll", function () {
      var y = window.scrollY;
      if (header.classList.contains("is-open")) { lastY = y; return; }
      if (y > lastY && y > 80) header.classList.add("site-header--hidden");
      else if (y < lastY) header.classList.remove("site-header--hidden");
      lastY = y;
    }, { passive: true });
  }

  // PDP quantity stepper
  var qty = document.querySelector("[data-qty]");
  if (qty) {
    var value = qty.querySelector("[data-qty-value]");
    qty.querySelector("[data-qty-minus]").addEventListener("click", function () {
      value.textContent = Math.max(1, parseInt(value.textContent, 10) - 1);
    });
    qty.querySelector("[data-qty-plus]").addEventListener("click", function () {
      value.textContent = parseInt(value.textContent, 10) + 1;
    });
  }

  // PDP gallery (mobile): thumbnails + pagination dots drive the main image.
  // Active thumb gets .is-active (CSS pulls it to the left via order:-1).
  var gallery = document.querySelector("[data-gallery]");
  if (gallery) {
    var mainImg = gallery.querySelector("[data-gallery-main] img");
    var strip = gallery.querySelector("[data-gallery-thumbs]");
    var thumbs = [].slice.call(gallery.querySelectorAll(".pdp__thumb"));
    var dots = [].slice.call(gallery.querySelectorAll(".pdp__dot"));
    var current = 0;
    var setActive = function (index) {
      index = Math.max(0, Math.min(thumbs.length - 1, index));
      current = index;
      thumbs.forEach(function (t, i) { t.classList.toggle("is-active", i === index); });
      dots.forEach(function (d, i) { d.classList.toggle("is-active", i === index); });
      // read the thumb's own <img> src (path-prefix aware) rather than a custom
      // data-full attribute the HtmlBase plugin doesn't rewrite
      var timg = thumbs[index] && thumbs[index].querySelector("img");
      var full = timg && (timg.getAttribute("src") || timg.src);
      if (full && mainImg) { mainImg.src = full; }
      // auto-scroll the strip so the active thumb is centred in view
      if (strip && thumbs[index]) {
        var t = thumbs[index];
        var target = t.offsetLeft - (strip.clientWidth / 2) + (t.offsetWidth / 2);
        strip.scrollTo({ left: target, behavior: "smooth" });
      }
    };
    thumbs.forEach(function (t, i) { t.addEventListener("click", function () { setActive(i); }); });
    dots.forEach(function (d, i) { d.addEventListener("click", function () { setActive(i); }); });

    // Swipe the main image left/right to browse (mobile)
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
        // horizontal intent only, past a 40px threshold
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
          setActive(dx < 0 ? current + 1 : current - 1);
        }
      }, { passive: true });
    }
  }

  // PDP swatch selection (visual only)
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

  // Shop page: type tabs, filters toggle, Load More (placeholder behaviour;
  // real filtering/pagination comes from Shopify collection data later).
  var shopGrid = document.querySelector("[data-shop-grid]");
  if (shopGrid) {
    var cells = [].slice.call(shopGrid.querySelectorAll(".shop__cell"));
    var pageSize = 8;
    var activeType = "all";

    var apply = function () {
      var shown = 0;
      cells.forEach(function (cell) {
        var matches = activeType === "all" || cell.getAttribute("data-type") === activeType;
        // reveal up to (visibleCount) matching cells; hide the rest
        if (matches && shown < visibleCount) { cell.hidden = false; shown++; }
        else { cell.hidden = true; }
      });
      var totalMatching = cells.filter(function (c) {
        return activeType === "all" || c.getAttribute("data-type") === activeType;
      }).length;
      var wrap = document.querySelector("[data-loadmore-wrap]");
      if (wrap) { wrap.toggleAttribute("data-exhausted", visibleCount >= totalMatching); }
    };

    var visibleCount = pageSize;

    var types = document.querySelector("[data-shop-types]");
    if (types) {
      types.querySelectorAll(".shop__type").forEach(function (tab) {
        tab.addEventListener("click", function () {
          types.querySelectorAll(".shop__type").forEach(function (t) {
            t.classList.remove("is-active"); t.setAttribute("aria-selected", "false");
          });
          tab.classList.add("is-active"); tab.setAttribute("aria-selected", "true");
          activeType = tab.getAttribute("data-type");
          visibleCount = pageSize; // reset paging on filter change
          apply();
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
        apply();
      });
    }

    apply();
  }

  /* ---------- Motion layer ---------- */
  if (reducedMotion) { return; }
  if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") { return; }

  document.documentElement.classList.add("has-gsap");
  gsap.registerPlugin(ScrollTrigger);

  // Lenis smooth scroll, synced to ScrollTrigger
  var lenis = null;
  if (typeof Lenis !== "undefined") {
    lenis = new Lenis({ lerp: 0.12, wheelMultiplier: 1 });
    lenis.on("scroll", function () {
      ScrollTrigger.update();
      updateHeaderTheme();
    });
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  // Hero: headline fade-up on load, media slow zoom-out
  var heroHeadline = document.querySelector("[data-hero-headline]");
  if (heroHeadline) {
    gsap.from(heroHeadline, { y: 40, opacity: 0, duration: 1.1, ease: "power3.out", delay: 0.15 });
    var heroImg = document.querySelector(".hero__media img");
    if (heroImg) {
      gsap.from(heroImg, { scale: 1.08, duration: 1.8, ease: "power2.out" });
    }
  }

  // Generic reveal-on-scroll
  document.querySelectorAll(".reveal").forEach(function (el) {
    gsap.to(el, {
      opacity: 1, y: 0, duration: 0.9, ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 88%" }
    });
  });

  // Night banner: subtle parallax
  var parallax = document.querySelector("[data-parallax]");
  if (parallax) {
    gsap.fromTo(parallax, { yPercent: -8 }, {
      yPercent: 8, ease: "none",
      scrollTrigger: { trigger: parallax.parentElement, start: "top bottom", end: "bottom top", scrub: true }
    });
  }

  // Footer closer: rises in
  var closer = document.querySelector("[data-closer]");
  if (closer) {
    gsap.from(closer, {
      y: 60, opacity: 0, duration: 1, ease: "power3.out",
      scrollTrigger: { trigger: closer, start: "top 92%" }
    });
  }
})();
