import axios, { AxiosResponse } from "axios";
import * as fs from "fs";
import * as path from "path";
import pLimit from "p-limit";
import { resolveResources, extractCssUrls } from "../resolver";
import { getWaybackUrl } from "../archiver";
import {
  urlToFilePath,
  ensureDir,
  isHtml,
  isDownloadable,
  isSameDomain,
  normalizeUrl,
} from "../utils";

export interface DownloadOptions {
  wayback?: boolean;
  depth?: number;
  concurrency?: number;
}

export interface DownloadError {
  url: string;
  message: string;
}

export interface DownloadResult {
  success: boolean;
  filesDownloaded: number;
  errors: DownloadError[];
  archived: boolean;
}

interface QueueItem {
  url: string;
  depth: number;
}

const DEFAULT_DEPTH = 5;
const DEFAULT_CONCURRENCY = 3;

const HTTP_AGENT = axios.create({
  timeout: 30000,
  maxRedirects: 10,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (compatible; Websitetor/1.0; +https://npmjs.com/package/websitetor)",
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
  },
  responseType: "arraybuffer",
});

export async function download(
  url: string,
  destination: string,
  options: DownloadOptions = {}
): Promise<DownloadResult> {
  const maxDepth = options.depth ?? DEFAULT_DEPTH;
  const concurrency = options.concurrency ?? DEFAULT_CONCURRENCY;
  const useWayback = options.wayback ?? false;
  const limit = pLimit(concurrency);

  const visited = new Set<string>();
  const errors: DownloadError[] = [];
  let filesDownloaded = 0;

  const normalizedStart = normalizeUrl(url);
  const startUrl = useWayback
    ? (await getWaybackUrl(normalizedStart)) ?? normalizedStart
    : normalizedStart;

  const queue: QueueItem[] = [{ url: startUrl, depth: 0 }];
  const enqueued = new Set<string>([startUrl]);

  fs.mkdirSync(destination, { recursive: true });

  while (queue.length > 0) {
    const batch = queue.splice(0, concurrency * 2);
    const tasks = batch.map((item) =>
      limit(async () => {
        const { url: itemUrl, depth } = item;

        if (visited.has(itemUrl)) return;
        visited.add(itemUrl);

        let response: AxiosResponse<Buffer>;
        try {
          response = await HTTP_AGENT.get<Buffer>(itemUrl);
        } catch (err) {
          const message =
            err instanceof Error ? err.message : String(err);
          errors.push({ url: itemUrl, message });
          return;
        }

        const contentType =
          (response.headers["content-type"] as string | undefined) ?? "";
        const bodyBuffer = Buffer.from(response.data);
        const bodyText = bodyBuffer.toString("utf-8");

        const originalUrl = useWayback
          ? normalizedStart
          : itemUrl;

        const filePath = urlToFilePath(
          useWayback ? resolveOriginalUrl(itemUrl, normalizedStart) : itemUrl,
          destination
        );

        try {
          ensureDir(filePath);
          fs.writeFileSync(filePath, bodyBuffer);
          filesDownloaded++;
        } catch (err) {
          const message =
            err instanceof Error ? err.message : String(err);
          errors.push({ url: itemUrl, message: `Write error: ${message}` });
          return;
        }

        if (isHtml(contentType)) {
          if (depth < maxDepth) {
            const { links, assets } = resolveResources(bodyText, itemUrl);

            for (const link of links) {
              if (
                !enqueued.has(link) &&
                isDownloadable(link) &&
                isSameDomain(link, originalUrl)
              ) {
                enqueued.add(link);
                queue.push({ url: link, depth: depth + 1 });
              }
            }

            for (const asset of assets) {
              if (!enqueued.has(asset) && isDownloadable(asset)) {
                enqueued.add(asset);
                queue.push({ url: asset, depth: depth + 1 });
              }
            }
          }
        } else if (
          contentType.includes("text/css") ||
          filePath.endsWith(".css")
        ) {
          const cssUrls = extractCssUrls(bodyText, itemUrl);
          for (const cssUrl of cssUrls) {
            if (!enqueued.has(cssUrl) && isDownloadable(cssUrl)) {
              enqueued.add(cssUrl);
              queue.push({ url: cssUrl, depth: depth + 1 });
            }
          }
        }
      })
    );

    await Promise.allSettled(tasks);
  }

  return {
    success: errors.length === 0 || filesDownloaded > 0,
    filesDownloaded,
    errors,
    archived: useWayback,
  };
}

function resolveOriginalUrl(waybackUrl: string, fallback: string): string {
  const pattern = /^https?:\/\/web\.archive\.org\/web\/\d+\/(https?:\/\/.+)$/;
  const match = pattern.exec(waybackUrl);
  return match?.[1] ?? fallback;
}
