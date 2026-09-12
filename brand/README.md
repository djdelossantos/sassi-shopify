# `brand/` — assets for surfaces outside the theme

Files here are **not** shipped with the theme. They exist for Shopify surfaces
that can't read `shopify-theme/assets/` — checkout being the main one, since it
is not theme code and is styled entirely from the admin.

## Logos

`assets/sassi-logo.svg` in the theme is a **mask shape**, not a picture: its
path carries `fill="currentColor"` and the header tints it via CSS
(`-webkit-mask` + `background`). Uploaded straight to Shopify Files it would
render plain black `#000000` — close enough to look right, wrong enough to be
off-brand next to real obsidian.

These two are the same path with an explicit brand fill, sized 4× (312×132) so
they stay crisp wherever they land:

| File | Fill | Use on |
|---|---|---|
| `sassi-logo-obsidian.svg` | `#12100e` | light / white headers |
| `sassi-logo-white.svg` | `#ffffff` | obsidian headers |

If a Shopify surface rejects SVG, export the same artboard from the Figma file
as a 2× PNG on a transparent background — don't screenshot these.
