import { chromium } from "playwright-core";
const b = await chromium.launch({ channel: "chrome", headless: true });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
const p = await ctx.newPage();
await p.goto("http://localhost:8080/", { waitUntil: "load" });
await p.waitForTimeout(1200);

console.log("HERO", JSON.stringify(await p.evaluate(() => {
  const h = document.querySelector(".hero");
  const img = document.querySelector(".hero__media img");
  return {
    src: img.getAttribute("src"),
    naturalW: img.naturalWidth, naturalH: img.naturalHeight,
    loaded: img.complete && img.naturalWidth > 0,
    height: Math.round(h.offsetHeight),
    noiseEl: !!document.querySelector(".hero__noise"),
  };
})));

await p.evaluate(() => document.querySelector(".brand-intro").scrollIntoView());
await p.waitForTimeout(700);
console.log("BRAND-INTRO", JSON.stringify(await p.evaluate(() => {
  const s = document.querySelector(".brand-intro");
  const media = document.querySelector(".brand-intro__media");
  const copy = document.querySelector(".brand-intro__copy");
  const inner = document.querySelector(".brand-intro__inner");
  const img = document.querySelector(".brand-intro__media img");
  const btn = document.querySelector(".brand-intro__cta .btn");
  const cs = getComputedStyle(s);
  return {
    sectionH: Math.round(s.offsetHeight),
    viewportH: window.innerHeight,
    bg: cs.backgroundColor,
    textColor: cs.color,
    mediaW: Math.round(media.offsetWidth),
    copyW: Math.round(copy.offsetWidth),
    innerMaxW: getComputedStyle(inner).maxWidth,
    btnW: Math.round(btn.offsetWidth),
    btnMaxW: getComputedStyle(btn).maxWidth,
    btnBg: getComputedStyle(btn).backgroundColor,
    imgSrc: img.getAttribute("src"),
    imgLoaded: img.complete && img.naturalWidth > 0,
    imgNatural: img.naturalWidth + "x" + img.naturalHeight,
  };
})));

console.log("HEADER-GROUPS", JSON.stringify(await p.evaluate(() => {
  const g = (sel) => {
    const el = document.querySelector(sel);
    return el.className.replace("site-header__", "").split(" ").filter(c => c.startsWith("on-"))[0] || "?";
  };
  return {
    left: g(".site-header__left"), logo: g(".site-header__logo"), icons: g(".site-header__icons"),
    noScrim: document.querySelector("[data-header]").classList.contains("site-header--no-scrim"),
  };
})));
await b.close();
