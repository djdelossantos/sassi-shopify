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

    var introSeen = false;
    try { introSeen = sessionStorage.getItem("sassi_intro") === "1"; sessionStorage.setItem("sassi_intro", "1"); } catch (e) {}

    if (introSeen) {
      // Standard navigation: play the full preloader only on the first page of the
      // session; afterwards reveal immediately (defer one frame so buildMainMotion
      // has registered this page's reveal hooks first).
      requestAnimationFrame(function () { firePageReveal(); pre.classList.add("is-done"); });
    } else if (reducedMotion) {
      // No count animation; snap to 100 and reveal (without motion) once loaded.
      if (countEl) { countEl.textContent = "100"; }
      var revealRM = function () { setTimeout(finishPre, 400); };
      if (document.readyState === "complete") { revealRM(); }
      else { window.addEventListener("load", revealRM, { once: true }); }
    } else {
      var preStart = performance.now();
      var preMin = 1200;                               // always show at least this long
      var preReady = document.readyState === "complete";
      window.addEventListener("load", function () { preReady = true; });
      setTimeout(function () { preReady = true; }, 10000); // safety: never trap the page
      var preVal = 0;
      var preFmt = function (n) {
        n = Math.max(0, Math.min(100, Math.round(n)));
        return n < 100 ? ("0" + n).slice(-2) : "100";
      };
      var preTick = function (now) {
        var elapsed = now - preStart;
        // Creep toward ~90 while loading; race to 100 once ready and past the min.
        var target = (preReady && elapsed >= preMin) ? 100 : 90 * (1 - Math.exp(-elapsed / 650));
        preVal += (target - preVal) * 0.1;
        if (target === 100 && preVal > 99.3) { preVal = 100; }
        if (countEl) { countEl.textContent = preFmt(preVal); }
        if (preVal >= 100) { finishPre(); return; }
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
      shopGrid.dispatchEvent(new CustomEvent("shop:changed")); // let the motion layer batch-reveal new cards
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
  function initAccordions() {
    var accs = document.querySelectorAll(".accordion");
    if (!accs.length || !motionOn) { return; }
    accs.forEach(function (details) {
      var summary = details.querySelector("summary");
      var body = details.querySelector(".accordion__body");
      if (!summary || !body) { return; }
      if (details.open) { details.classList.add("is-open"); }
      summary.addEventListener("click", function (e) {
        e.preventDefault();
        if (details._busy) { return; }
        details._busy = true;
        if (!details.open) {
          details.open = true;
          details.classList.add("is-open");
          var full = body.scrollHeight;
          gsap.fromTo(body, { height: 0, opacity: 0 }, {
            height: full, opacity: 1, duration: 0.4, ease: "power2.out",
            onComplete: function () { body.style.height = "auto"; details._busy = false; }
          });
        } else {
          details.classList.remove("is-open");
          gsap.to(body, {
            height: 0, opacity: 0, duration: 0.35, ease: "power2.inOut",
            onComplete: function () { details.open = false; body.style.height = ""; body.style.opacity = ""; details._busy = false; }
          });
        }
      });
    });
  }

  function initFeatures() {
    initQty();
    initGallery();
    initSwatches();
    initShop();
    initHeroCarousel();
    initAccordions();
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
  // DISABLED for the Shopify port: we use standard navigation first (cart, section
  // rendering and checkout are safest without a custom router). Re-enable in a
  // later phase by restoring `canIntro` here and adapting swapContent to Shopify.
  if (false && canIntro) {
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
