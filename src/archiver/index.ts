import axios from "axios";

const WAYBACK_AVAILABILITY_API =
  "https://archive.org/wayback/available?url=";

const WAYBACK_BASE = "https://web.archive.org/web";

export interface WaybackSnapshot {
  url: string;
  timestamp: string;
  available: boolean;
}

export async function getWaybackUrl(
  originalUrl: string
): Promise<string | null> {
  try {
    const response = await axios.get<{
      archived_snapshots?: {
        closest?: {
          available?: boolean;
          url?: string;
          timestamp?: string;
          status?: string;
        };
      };
    }>(`${WAYBACK_AVAILABILITY_API}${encodeURIComponent(originalUrl)}`, {
      timeout: 10000,
    });

    const closest = response.data?.archived_snapshots?.closest;
    if (closest?.available && closest.url) {
      return closest.url;
    }

    return `${WAYBACK_BASE}/${originalUrl}`;
  } catch {
    return `${WAYBACK_BASE}/${originalUrl}`;
  }
}

export function transformWaybackUrl(
  originalUrl: string,
  timestamp?: string
): string {
  const ts = timestamp ?? "";
  return `${WAYBACK_BASE}/${ts}/${originalUrl}`;
}

export function extractOriginalUrl(waybackUrl: string): string | null {
  const pattern = /^https?:\/\/web\.archive\.org\/web\/\d+\/(.+)$/;
  const match = pattern.exec(waybackUrl);
  if (match?.[1]) {
    return match[1];
  }
  return null;
}

export function rewriteWaybackLinks(
  html: string,
  baseWaybackUrl: string
): string {
  const timestampMatch = baseWaybackUrl.match(
    /web\.archive\.org\/web\/(\d+)\//
  );
  const timestamp = timestampMatch?.[1] ?? "";

  return html
    .replace(
      /href="\/web\/\d+\/(https?:\/\/[^"]+)"/g,
      `href="$1"`
    )
    .replace(
      /src="\/web\/\d+\/(https?:\/\/[^"]+)"/g,
      `src="$1"`
    )
    .replace(/href="\/web\/(\d+)\//g, `href="${WAYBACK_BASE}/${timestamp}/`)
    .replace(/src="\/web\/(\d+)\//g, `src="${WAYBACK_BASE}/${timestamp}/`);
}

export { timestamp as getTimestamp };
function timestamp(): string {
  const now = new Date();
  return (
    now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, "0") +
    String(now.getDate()).padStart(2, "0") +
    String(now.getHours()).padStart(2, "0") +
    String(now.getMinutes()).padStart(2, "0") +
    String(now.getSeconds()).padStart(2, "0")
  );
}
