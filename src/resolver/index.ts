import * as cheerio from "cheerio";
import { resolveUrl, normalizeUrl } from "../utils";

export interface ResolvedResources {
  links: string[];
  assets: string[];
}

const ASSET_SELECTORS: Array<{ selector: string; attr: string }> = [
  { selector: "link[rel='stylesheet']", attr: "href" },
  { selector: "link[rel='icon']", attr: "href" },
  { selector: "link[rel='shortcut icon']", attr: "href" },
  { selector: "link[rel='apple-touch-icon']", attr: "href" },
  { selector: "script[src]", attr: "src" },
  { selector: "img[src]", attr: "src" },
  { selector: "img[data-src]", attr: "data-src" },
  { selector: "source[src]", attr: "src" },
  { selector: "source[srcset]", attr: "srcset" },
  { selector: "video[src]", attr: "src" },
  { selector: "audio[src]", attr: "src" },
  { selector: "embed[src]", attr: "src" },
  { selector: "object[data]", attr: "data" },
];

export function resolveResources(
  html: string,
  baseUrl: string
): ResolvedResources {
  const $ = cheerio.load(html);
  const links = new Set<string>();
  const assets = new Set<string>();

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:") || href.startsWith("#")) {
      return;
    }
    const resolved = resolveUrl(baseUrl, href);
    if (resolved) {
      links.add(normalizeUrl(resolved));
    }
  });

  for (const { selector, attr } of ASSET_SELECTORS) {
    $(selector).each((_, el) => {
      const value = $(el).attr(attr);
      if (!value) return;

      if (attr === "srcset") {
        const parts = value.split(",").map((s) => s.trim().split(/\s+/)[0]);
        for (const part of parts) {
          const resolved = resolveUrl(baseUrl, part);
          if (resolved) assets.add(normalizeUrl(resolved));
        }
      } else {
        const resolved = resolveUrl(baseUrl, value);
        if (resolved) assets.add(normalizeUrl(resolved));
      }
    });
  }

  const cssUrls = extractCssUrls(html, baseUrl);
  for (const u of cssUrls) {
    assets.add(u);
  }

  return {
    links: Array.from(links),
    assets: Array.from(assets),
  };
}

export function extractCssUrls(content: string, baseUrl: string): string[] {
  const urls: string[] = [];
  const urlPattern = /url\(['"]?([^'")\s]+)['"]?\)/g;
  let match: RegExpExecArray | null;

  while ((match = urlPattern.exec(content)) !== null) {
    const rawUrl = match[1];
    if (rawUrl && !rawUrl.startsWith("data:")) {
      const resolved = resolveUrl(baseUrl, rawUrl);
      if (resolved) urls.push(normalizeUrl(resolved));
    }
  }

  const importPattern = /@import\s+(?:url\(['"]?|['"])([^'")\s]+)['"]?\)?/g;
  while ((match = importPattern.exec(content)) !== null) {
    const rawUrl = match[1];
    if (rawUrl) {
      const resolved = resolveUrl(baseUrl, rawUrl);
      if (resolved) urls.push(normalizeUrl(resolved));
    }
  }

  return urls;
}
