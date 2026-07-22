import { chromium } from "playwright-core";
const b = await chromium.launch({ channel: "chrome", headless: true });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
await p.goto("http://localhost:8080/", { waitUntil: "load" });
await p.waitForTimeout(1200);

console.log("CENTERING", JSON.stringify(await p.evaluate(() => {
  const logo = document.querySelector(".site-header__logo").getBoundingClientRect();
  const nav = document.querySelector(".site-header__nav").getBoundingClientRect();
  const icons = document.querySelector(".site-header__icons").getBoundingClientRect();
  return {
    logoCenterOffsetFromPageCenter: Math.round((logo.left + logo.right) / 2 - 720),
    navLeft: Math.round(nav.left),
    iconsRightGap: Math.round(1440 - icons.right),
  };
})));

// bottom of page = footer
await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await p.waitForTimeout(600);
console.log("FOOTER", JSON.stringify(await p.evaluate(() => {
  const h = document.querySelector("[data-header]");
  const probe = h.offsetHeight * 0.5;
  let sec = "none";
  document.querySelectorAll("[data-section-theme]").forEach((s) => {
    const r = s.getBoundingClientRect();
    if (r.top <= probe && r.bottom > probe && sec === "none") sec = s.dataset.section + ":" + s.dataset.sectionTheme;
  });
  return { under: sec, onLight: h.classList.contains("site-header--on-light"), color: getComputedStyle(h).color };
})));

// mobile: solid bar, always white, unchanged
const m = await b.newContext({ viewport: { width: 390, height: 844 } });
const mp = await m.newPage();
await mp.goto("http://localhost:8080/", { waitUntil: "load" });
await mp.waitForTimeout(800);
console.log("MOBILE", JSON.stringify(await mp.evaluate(() => {
  const h = document.querySelector("[data-header]");
  const cs = getComputedStyle(h);
  return {
    height: Math.round(h.offsetHeight),
    bgColor: cs.backgroundColor,
    bgImage: cs.backgroundImage,
    color: cs.color,
    mainPadTop: getComputedStyle(document.querySelector("main")).paddingTop,
  };
})));
await b.close();
