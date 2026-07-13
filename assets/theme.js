(function () {
  'use strict';

  document.documentElement.style.setProperty(
    '--sassi-grain-opacity',
    (window.sassiGrainOpacity !== undefined ? window.sassiGrainOpacity : 0.14)
  );

  /* ---------------------------------------------------------------------
     Header color flip: header goes obsidian-on-light unless the section
     currently under it (a ~32px band from top) is flagged [data-dark].
     -------------------------------------------------------------------- */
  function initHeaderFlip() {
    var header = document.querySelector('[data-sassi-header]');
    if (!header) return;
    var band = 32;
    var darkEls = document.querySelectorAll('[data-dark]');

    function update() {
      var overDark = false;
      for (var i = 0; i < darkEls.length; i++) {
        var r = darkEls[i].getBoundingClientRect();
        if (r.top <= band && r.bottom >= band) {
          overDark = true;
          break;
        }
      }
      header.classList.toggle('is-on-light', !overDark);
    }

    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  /* ---------------------------------------------------------------------
     Smooth anchor scrolling with fixed-header offset.
     -------------------------------------------------------------------- */
  function initAnchorScroll() {
    var links = document.querySelectorAll('a[href^="#"]');
    links.forEach(function (a) {
      var id = a.getAttribute('href');
      if (!id || id.length < 2) return;
      a.addEventListener('click', function (e) {
        var target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        var y = target.getBoundingClientRect().top + window.pageYOffset - 70;
        window.scrollTo({ top: y, behavior: 'smooth' });
      });
    });
  }

  /* ---------------------------------------------------------------------
     Hero intro: staggered fade/slide-up on load.
     -------------------------------------------------------------------- */
  function initHeroIntro() {
    var els = document.querySelectorAll('[data-intro]');
    els.forEach(function (el, i) {
      setTimeout(function () {
        el.classList.add('is-visible');
      }, 180 + i * 160);
    });
  }

  /* ---------------------------------------------------------------------
     Scroll reveals via IntersectionObserver, one-shot.
     -------------------------------------------------------------------- */
  function initScrollReveals() {
    var els = document.querySelectorAll('[data-reveal]');
    if (!('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------------------------------------------------------------------
     Velocity-driven seamless marquee.
     -------------------------------------------------------------------- */
  function initMarquee() {
    var track = document.querySelector('[data-sassi-marquee]');
    if (!track || !track.children.length) return;
    var strip = track.children[0];
    var stripW = strip.getBoundingClientRect().width;

    if ('ResizeObserver' in window) {
      new ResizeObserver(function () {
        stripW = strip.getBoundingClientRect().width;
      }).observe(strip);
    }

    var x = 0;
    var last = performance.now();
    var base = 28;
    var lastScrollY = window.pageYOffset;
    var velocity = 0;

    window.addEventListener(
      'scroll',
      function () {
        var y = window.pageYOffset;
        velocity = y - lastScrollY;
        lastScrollY = y;
      },
      { passive: true }
    );

    function loop(now) {
      var dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      var speed = base + Math.abs(velocity) * 4;
      velocity *= 0.9;
      x -= speed * dt;
      if (stripW > 0) {
        while (x <= -stripW) x += stripW;
      }
      track.style.transform = 'translate3d(' + x + 'px,0,0)';
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }

  /* ---------------------------------------------------------------------
     Newsletter form: swap button label on submit (Shopify handles the
     actual customer subscription; this is just the UI state).
     -------------------------------------------------------------------- */
  function initNewsletter() {
    var form = document.getElementById('sassi-newsletter-form');
    if (!form) return;
    var button = form.querySelector('[data-newsletter-submit]');
    if (!button) return;
    form.addEventListener('submit', function () {
      var defaultLabel = button.querySelector('[data-label-default]');
      var submittedLabel = button.querySelector('[data-label-submitted]');
      if (defaultLabel && submittedLabel) {
        defaultLabel.hidden = true;
        submittedLabel.hidden = false;
      }
    });
  }

  function init() {
    initHeaderFlip();
    initAnchorScroll();
    initHeroIntro();
    initScrollReveals();
    initMarquee();
    initNewsletter();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
