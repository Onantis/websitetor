import * as fs from "fs";
import * as path from "path";
import * as cheerio from "cheerio";

export interface BrokenLink {
  file: string;
  href: string;
  reason: string;
}

export interface MissingAsset {
  file: string;
  src: string;
  reason: string;
}

export interface ValidationResult {
  valid: boolean;
  htmlFiles: number;
  brokenLinks: BrokenLink[];
  missingAssets: MissingAsset[];
}

const LINK_SELECTORS: Array<{ selector: string; attr: string }> = [
  { selector: "link[href]", attr: "href" },
  { selector: "script[src]", attr: "src" },
  { selector: "img[src]", attr: "src" },
  { selector: "img[data-src]", attr: "data-src" },
  { selector: "source[src]", attr: "src" },
  { selector: "video[src]", attr: "src" },
  { selector: "audio[src]", attr: "src" },
  { selector: "embed[src]", attr: "src" },
  { selector: "object[data]", attr: "data" },
];

function collectHtmlFiles(dir: string): string[] {
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectHtmlFiles(full));
    } else if (entry.name.endsWith(".html") || entry.name.endsWith(".htm")) {
      results.push(full);
    }
  }
  return results;
}

function resolveLocalPath(ref: string, htmlFile: string, siteRoot: string): string | null {
  if (
    ref.startsWith("http://") ||
    ref.startsWith("https://") ||
    ref.startsWith("//") ||
    ref.startsWith("data:") ||
    ref.startsWith("mailto:") ||
    ref.startsWith("tel:") ||
    ref.startsWith("javascript:") ||
    ref.startsWith("#")
  ) {
    return null;
  }

  if (ref.startsWith("/")) {
    return path.join(siteRoot, ref.slice(1));
  }

  return path.resolve(path.dirname(htmlFile), ref);
}

function stripFragment(ref: string): string {
  const idx = ref.indexOf("#");
  return idx >= 0 ? ref.slice(0, idx) : ref;
}

function checkExists(filePath: string): boolean {
  if (fs.existsSync(filePath)) return true;
  if (fs.existsSync(filePath + ".html")) return true;
  if (fs.existsSync(path.join(filePath, "index.html"))) return true;
  return false;
}

export function validate(sitePath: string): ValidationResult {
  const siteRoot = path.resolve(sitePath);

  if (!fs.existsSync(siteRoot)) {
    throw new Error(`Path does not exist: ${siteRoot}`);
  }

  const htmlFiles = collectHtmlFiles(siteRoot);
  const brokenLinks: BrokenLink[] = [];
  const missingAssets: MissingAsset[] = [];

  for (const htmlFile of htmlFiles) {
    const relFile = path.relative(siteRoot, htmlFile);
    const html = fs.readFileSync(htmlFile, "utf-8");
    const $ = cheerio.load(html);

    $("a[href]").each((_, el) => {
      const raw = $(el).attr("href") ?? "";
      const ref = stripFragment(raw);
      if (!ref) return;

      const local = resolveLocalPath(ref, htmlFile, siteRoot);
      if (!local) return;

      if (!checkExists(local)) {
        brokenLinks.push({ file: relFile, href: ref, reason: "File not found on disk" });
      }
    });

    for (const { selector, attr } of LINK_SELECTORS) {
      $(selector).each((_, el) => {
        const raw = $(el).attr(attr) ?? "";

        if (attr === "srcset") {
          const parts = raw.split(",").map((s: string) => s.trim().split(/\s+/)[0]).filter(Boolean);
          for (const part of parts) {
            const local = resolveLocalPath(part, htmlFile, siteRoot);
            if (!local) continue;
            if (!fs.existsSync(local)) {
              missingAssets.push({ file: relFile, src: part, reason: "Asset not found on disk" });
            }
          }
          return;
        }

        if (!raw) return;
        const local = resolveLocalPath(raw, htmlFile, siteRoot);
        if (!local) return;

        if (!fs.existsSync(local)) {
          missingAssets.push({ file: relFile, src: raw, reason: "Asset not found on disk" });
        }
      });
    }
  }

  return {
    valid: brokenLinks.length === 0 && missingAssets.length === 0,
    htmlFiles: htmlFiles.length,
    brokenLinks,
    missingAssets,
  };
}
