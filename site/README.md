# `site/` — frozen design prototype

**This directory is no longer the source of truth. Build in [`../shopify-theme/`](../shopify-theme/) instead.**

As of 2026-09-10, `shopify-theme/` is the only tree that gets new work. `site/` is the
original Eleventy/LiquidJS design reference, kept because `.github/workflows/deploy.yml`
still builds it to the GitHub Pages preview at
`djdelossantos.github.io/sassi-shopify/`.

## Why it's frozen

The two trees are separate codebases, not two views of one, and they had drifted:

- `site/` has no Contact page and no Affiliate page — both exist only in the theme.
- Its `assets/css/theme.css` sits roughly 450 lines behind the theme's.

Keeping them in step meant making every change twice, and the usual failure mode was
editing one tree and wondering why the other URL didn't update.

## What this means day to day

- New sections, pages and styles go in `shopify-theme/` only.
- Preview with `shopify theme dev` (serves `shopify-theme/` at `127.0.0.1:9292`) or a
  Shopify theme preview link — not the Pages URL.
- The Pages build will keep reflecting this older prototype. That's expected. If it ever
  needs to be retired, delete the `deploy.yml` workflow along with this directory.
