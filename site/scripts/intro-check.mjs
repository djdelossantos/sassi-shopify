import { chromium } from "playwright-core";
const b = await chromium.launch({ channel: "chrome", headless: true });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();

let reloads = 0;
p.on("framenavigated", (f) => { if (f === p.mainFrame()) reloads++; });

const snap = () => p.evaluate(() => ({
  path: location.pathname,
  title: document.title,
  bodyClass: document.body.className,
  hasMain: !!document.querySelector("main"),
  introDisplay: getComputedStyle(document.querySelector("[data-page-intro]")).display,
  overlayDone: document.querySelector("[data-page-intro]").classList.contains("is-done"),
}));

await p.goto("http://localhost:8080/", { waitUntil: "load" });
const startNavs = reloads;
console.log("HOME:", JSON.stringify(await snap()));

// Click to Shop — should be a client-side swap (NO full navigation).
await p.click('a[href="/shop/"]');
await p.waitForFunction(() => location.pathname === "/shop/" && document.querySelector("[data-shop-grid]"));
await p.waitForTimeout(1600); // let reveal finish
console.log("AFTER →/shop/:", JSON.stringify(await snap()));
console.log("full-page navigations during click:", reloads - startNavs, "(expect 0 = client-side)");

// Verify a swapped-in feature actually works: click a shop type tab.
const beforeTab = await p.$$eval(".shop__cell:not([hidden])", (n) => n.length);
await p.click('.shop__type[data-type="backpacks"]').catch(() => {});
await p.waitForTimeout(200);
const afterTab = await p.$$eval(".shop__cell:not([hidden])", (n) => n.length);
console.log("shop tab re-init works? visible cells", beforeTab, "→", afterTab, "(should change)");

// Navigate on to the PDP, then use browser Back → should animate back to shop.
await p.click('a[href="/products/atreus-backpack/"]').catch(() => {});
await p.waitForFunction(() => location.pathname.includes("atreus")).catch(() => {});
await p.waitForTimeout(1600);
console.log("AFTER →PDP:", JSON.stringify(await snap()));

await p.goBack();
await p.waitForTimeout(1700);
console.log("AFTER Back:", JSON.stringify(await snap()));

// A plain reload shows no animation.
await p.reload({ waitUntil: "load" });
await p.waitForTimeout(400);
console.log("RELOAD:", JSON.stringify(await snap()));

await b.close();
