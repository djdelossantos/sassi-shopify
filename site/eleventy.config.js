export default function (eleventyConfig) {
  // Static assets copied through untouched — maps 1:1 to Shopify /assets
  eleventyConfig.addPassthroughCopy({ "assets": "assets" });

  // Shopify-style money filter so templates read like Liquid on Shopify
  eleventyConfig.addFilter("money", function (value) {
    if (typeof value === "number") {
      return "₱" + value.toLocaleString("en-PH");
    }
    return value;
  });

  return {
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
