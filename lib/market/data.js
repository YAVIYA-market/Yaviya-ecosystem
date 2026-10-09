import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { JSDOM } from "jsdom";
import config from "../../backend/data/market-config.json" with { type: "json" };
import {
  seedCatalogue,
  seedCatalogueCG,
  seedShops,
  seedShopsCG,
} from "../../backend/worker/catalogue-seeds.js";
export async function marketData(country = "CD") {
  const source = await readFile("frontend/src/popular-faq.js", "utf8");
  const declaration = source.slice(0, source.indexOf("\n];") + 3);
  const faq = vm.runInNewContext(declaration + "\npopularQuestions");
  return JSON.parse(
    JSON.stringify({
      country,
      config,
      faq,
      initialProducts: country === "CG" ? seedCatalogueCG : seedCatalogue,
      initialShops: country === "CG" ? seedShopsCG : seedShops,
    }),
  );
}
export async function staticContent(name) {
  if (!["confidentialite", "publicite"].includes(name))
    throw new Error("Page inconnue");
  const html = await readFile(`frontend/pages/${name}.html`, "utf8");
  const dom = new JSDOM(html);
  const serialize = (node) => {
    if (node.nodeType === 3) return node.textContent;
    if (
      node.nodeType !== 1 ||
      ["SCRIPT", "STYLE", "INPUT", "BUTTON", "FORM"].includes(node.tagName)
    )
      return null;
    const props = {};
    for (const { name, value } of node.attributes) {
      if (/^on/i.test(name) || name === "style") continue;
      props[
        name === "class" ? "className" : name === "for" ? "htmlFor" : name
      ] = value;
    }
    return {
      tag: node.tagName.toLowerCase(),
      props,
      children: [...node.childNodes].map(serialize).filter((v) => v !== null),
    };
  };
  try {
    return [...dom.window.document.querySelector("main").childNodes]
      .map(serialize)
      .filter((v) => v !== null);
  } finally {
    dom.window.close();
  }
}
