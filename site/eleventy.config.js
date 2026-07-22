import { EleventyHtmlBasePlugin } from "@11ty/eleventy";

export default function (eleventyConfig) {
  // Static assets copied through untouched — maps 1:1 to Shopify /assets
  eleventyConfig.addPassthroughCopy({ "assets": "assets" });

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
