module.exports = function (eleventyConfig) {
  // Static assets nach _site kopieren
  eleventyConfig.addPassthroughCopy("assets");

  // Globale Daten
  eleventyConfig.addGlobalData("buildYear", new Date().getFullYear());
  eleventyConfig.addGlobalData("site", {
    name: "Denni Rauschenberg",
    domain: "denni-rauschenberg.de",
  });

  // Collection: Projekte (Tag "projekte")
  eleventyConfig.addCollection("projekte", function (collectionApi) {
    return collectionApi.getFilteredByTag("projekte");
  });

  // Wichtig: input=src, includes liegt dann bei src/_includes
  return {
    dir: {
      input: "src",
      includes: "_includes",
      output: "_site",
    },
  };
};
