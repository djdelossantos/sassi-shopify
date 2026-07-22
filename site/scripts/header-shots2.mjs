import { chromium } from "playwright-core";
const b = await chromium.launch({ channel: "chrome", headless: true });
const ctx = await b.newContext({ viewport: { width: 1440, height: 560 }, reducedMotion: "reduce" });
const p = await ctx.newPage();
await p.goto("http://localhost:8080/", { waitUntil: "load" });
await p.waitForTimeout(1000);
// band where the header overlaps the category photos
await p.evaluate(() => window.scrollTo(0, 1900));
await p.waitForTimeout(700);
await p.screenshot({ path: "qa/header-over-cat-photos.png" });
console.log("photos band:", await p.evaluate(() => document.querySelector("[data-header]").classList.contains("site-header--on-light") ? "DARK TEXT" : "LIGHT TEXT"));
// band where the header is over the white caption/whitespace area
await p.evaluate(() => window.scrollTo(0, 2450));
await p.waitForTimeout(700);
await p.screenshot({ path: "qa/header-over-cat-white.png" });
console.log("white band:", await p.evaluate(() => document.querySelector("[data-header]").classList.contains("site-header--on-light") ? "DARK TEXT" : "LIGHT TEXT"));
await b.close();
