import { chromium } from "playwright-core";
const b = await chromium.launch({ channel: "chrome", headless: true });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
await p.goto("http://localhost:8080/", { waitUntil: "load" });
await p.waitForTimeout(1200);

const box = await p.evaluate(() => {
  const h = document.querySelector("[data-header]");
  const inner = document.querySelector(".site-header__inner");
  const cs = getComputedStyle(h);
  const ci = getComputedStyle(inner);
  const r = inner.getBoundingClientRect();
  const nav = document.querySelector(".site-header__nav").getBoundingClientRect();
  const logo = document.querySelector(".site-header__logo").getBoundingClientRect();
  const icons = document.querySelector(".site-header__icons").getBoundingClientRect();
  return {
    headerHeight: Math.round(h.offsetHeight),
    background: cs.backgroundImage.slice(0, 70),
    bgColor: cs.backgroundColor,
    padding: ci.padding,
    navLeft: Math.round(nav.left),
    logoCenterOffset: Math.round((logo.left + logo.right) / 2 - 720),
    iconsRight: Math.round(1440 - icons.right),
    heroTop: Math.round(document.querySelector(".hero").getBoundingClientRect().top),
  };
});
console.log("LAYOUT", JSON.stringify(box, null, 1));

// scroll through the landing and record header state per section
const marks = [0, 900, 1900, 2900, 3900, 4700, 5600, 6600];
const seq = [];
for (const y of marks) {
  await p.evaluate((yy) => window.scrollTo(0, yy), y);
  await p.waitForTimeout(450);
  seq.push(await p.evaluate(() => {
    const h = document.querySelector("[data-header]");
    const probe = h.offsetHeight * 0.5;
    let sec = "none";
    document.querySelectorAll("[data-section-theme]").forEach((s) => {
      const r = s.getBoundingClientRect();
      if (r.top <= probe && r.bottom > probe && sec === "none") sec = s.dataset.section + ":" + s.dataset.sectionTheme;
    });
    return {
      y: Math.round(window.scrollY),
      under: sec,
      onLight: h.classList.contains("site-header--on-light"),
      color: getComputedStyle(h).color,
    };
  }));
}
console.log("SCROLL", JSON.stringify(seq, null, 1));

await p.goto("http://localhost:8080/products/atreus-backpack/", { waitUntil: "load" });
await p.waitForTimeout(1000);
console.log("PDP", JSON.stringify(await p.evaluate(() => {
  const h = document.querySelector("[data-header]");
  const title = document.querySelector(".pdp__title").getBoundingClientRect();
  return {
    onLight: h.classList.contains("site-header--on-light"),
    color: getComputedStyle(h).color,
    headerBottom: Math.round(h.offsetHeight),
    titleTop: Math.round(title.top),
  };
}), null, 1));
await b.close();
