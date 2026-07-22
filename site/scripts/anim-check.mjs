import { chromium } from "playwright-core";
const b = await chromium.launch({ channel: "chrome", headless: true });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); // NO reducedMotion
const p = await ctx.newPage();
await p.goto("http://localhost:8080/", { waitUntil: "networkidle" });
await p.waitForTimeout(2000);
const r1 = await p.evaluate(() => ({
  hasGsap: document.documentElement.classList.contains("has-gsap"),
  st: ScrollTrigger.getAll().length,
  heroOpacity: getComputedStyle(document.querySelector("[data-hero-headline]")).opacity,
}));
await p.mouse.wheel(0, 1400);
await p.waitForTimeout(1600);
const r2 = await p.evaluate(() => {
  const reveals = [...document.querySelectorAll(".reveal")].slice(0, 4);
  return {
    scrollY: Math.round(window.scrollY),
    revealOpacities: reveals.map((el) => getComputedStyle(el).opacity),
    lenisSmooth: !!window.Lenis,
  };
});
console.log(JSON.stringify({ ...r1, ...r2 }, null, 1));
await b.close();
