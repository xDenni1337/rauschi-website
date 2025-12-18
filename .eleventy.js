module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("assets");
  eleventyConfig.addGlobalData("buildYear", new Date().getFullYear());
  eleventyConfig.addCollection("projekte", function (collectionApi) {
  eleventyConfig.addGlobalData("site", {
  name: "Denni Rauschenberg",
  domain: "denni-rauschenberg.de"
});

    return collectionApi.getFilteredByTag("projekte");
  });

  return {
    dir: { input: "src", output: "_site" }
  };
};
