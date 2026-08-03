import { EleventyHtmlBasePlugin } from "@11ty/eleventy";

export default function (eleventyConfig) {
  // Static assets copied through untouched — maps 1:1 to Shopify /assets
  eleventyConfig.addPassthroughCopy({ "assets": "assets" });

  // Scroll-video frame sequences are hundreds of files that get rewritten in
  // bulk whenever they are re-extracted. Watching them floods the dev server
  // with add/change events and eventually exhausts Node's heap. They are still
  // copied to _site by the passthrough above — only the watcher ignores them,
  // so re-extracting means one manual restart rather than a crash.
  eleventyConfig.watchIgnores.add("assets/frames/**");

  // Rewrites href/src/srcset in output HTML to respect pathPrefix, so the
  // same absolute "/assets/..." paths work at the site root locally AND under
  // the /sassi-shopify/ subpath on GitHub Pages. Prefix defaults to "/" and is
  // overridden by `--pathprefix=/sassi-shopify/` in the Pages build.
  eleventyConfig.addPlugin(EleventyHtmlBasePlugin);

  // Shopify-style money filter so templates read like Liquid on Shopify
  eleventyConfig.addFilter("money", function (value) {
    if (typeof value === "number") {
      return "₱" + value.toLocaleString("en-PH");
    }
    return value;
  });

  return {
    pathPrefix: "/",
    dir: {
      input: ".",
      includes: "_includes",
      data: "_data",
      output: "_site",
    },
    templateFormats: ["liquid", "md"],
    htmlTemplateEngine: "liquid",
    markdownTemplateEngine: "liquid",
  };
}
