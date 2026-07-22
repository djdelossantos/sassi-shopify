// QA screenshot harness — captures full-page shots of the local site
// at mobile (390x844) and desktop (1440x900) using the installed Chrome.
// Usage: node scripts/shot.mjs [outdir]
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";

const out = process.argv[2] || "qa";
mkdirSync(out, { recursive: true });

const targets = [
  { name: "landing", url: "http://localhost:8080/" },
  { name: "pdp", url: "http://localhost:8080/products/atreus-backpack/" },
];
const viewports = [
  { name: "mobile", width: 390, height: 844 },
  { name: "desktop", width: 1440, height: 900 },
];

const browser = await chromium.launch({ channel: "chrome", headless: true });
for (const vp of viewports) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    reducedMotion: "reduce", // static truth — animations are QA'd separately
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  for (const t of targets) {
    await page.goto(t.url, { waitUntil: "load" });
    // Walk the page so every loading="lazy" image fires, then return to top.
    await page.evaluate(async () => {
      const step = window.innerHeight * 0.8;
      for (let y = 0; y < document.body.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 120));
      }
      window.scrollTo(0, 0);
      await Promise.all(
        Array.from(document.images)
          .filter((img) => !img.complete)
          .map((img) => new Promise((r) => { img.onload = img.onerror = r; }))
      );
    });
    await page.waitForTimeout(600); // fonts + decode settle
    await page.screenshot({ path: `${out}/${t.name}-${vp.name}.png`, fullPage: true });
    console.log(`${t.name}-${vp.name}.png`);
  }
  await ctx.close();
}
await browser.close();
