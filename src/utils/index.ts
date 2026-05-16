import * as fs from "fs";
import * as path from "path";
import * as url from "url";
import * as mime from "mime-types";

export function resolveUrl(base: string, relative: string): string | null {
  try {
    return new url.URL(relative, base).href;
  } catch {
    return null;
  }
}

export function isSameDomain(urlA: string, urlB: string): boolean {
  try {
    return new url.URL(urlA).hostname === new url.URL(urlB).hostname;
  } catch {
    return false;
  }
}

export function urlToFilePath(resourceUrl: string, destination: string): string {
  const parsed = new url.URL(resourceUrl);
  let filePath = parsed.pathname;

  if (filePath.endsWith("/") || filePath === "") {
    filePath = path.join(filePath, "index.html");
  }

  const hasExtension = path.extname(filePath) !== "";
  if (!hasExtension) {
    const contentType = mime.lookup(filePath);
    if (!contentType || contentType.startsWith("text/html")) {
      filePath = filePath + ".html";
    }
  }

  const cleanPath = filePath.startsWith("/") ? filePath.slice(1) : filePath;
  return path.join(destination, cleanPath);
}

export function ensureDir(filePath: string): void {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
}

export function isHtml(contentType: string | undefined): boolean {
  if (!contentType) return false;
  return contentType.includes("text/html");
}

export function isDownloadable(resourceUrl: string): boolean {
  try {
    const parsed = new url.URL(resourceUrl);
    const protocol = parsed.protocol;
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

export function normalizeUrl(resourceUrl: string): string {
  try {
    const parsed = new url.URL(resourceUrl);
    parsed.hash = "";
    return parsed.href;
  } catch {
    return resourceUrl;
  }
}
