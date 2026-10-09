module.exports = function (eleventyConfig) {
  // Static assets nach _site kopieren
  eleventyConfig.addPassthroughCopy("assets");

  // Globale Daten
  eleventyConfig.addGlobalData("buildYear", new Date().getFullYear());
  eleventyConfig.addGlobalData("site", {
    name: "Denni Rauschenberg",
    domain: "denni-rauschenberg.de",
  });

  // Sprache: Standard Deutsch, alles unter src/en/ ist Englisch (src/en/en.11tydata.json)
  eleventyConfig.addGlobalData("lang", "de");

  eleventyConfig.addFilter("byLang", (items, lang) =>
    (items || []).filter((item) => (item.data.lang || "de") === lang)
  );

  // URL derselben Seite in einer anderen Sprache (über translationKey).
  // Gibt es keine Übersetzung, geht es zur Startseite der Zielsprache.
  eleventyConfig.addFilter("translationUrl", (translationKey, targetLang, all) => {
    const match = (all || []).find(
      (item) => item.data.translationKey === translationKey && (item.data.lang || "de") === targetLang
    );
    if (match) return match.url;
    return targetLang === "en" ? "/en/" : "/";
  });

  // Archivierte Projekte (Front Matter "archiviert: true") getrennt von den aktuellen
  eleventyConfig.addFilter("archived", (items, archived) =>
    (items || []).filter((item) => Boolean(item.data.archiviert) === archived)
  );

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
