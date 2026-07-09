import { writeFile } from 'node:fs/promises';
import { safeFetch } from '../discovery/safe-fetch';

// Download a few real venue photos to local temp files so the demo-gen researcher (claude, Read tool) can
// VIEW them and curate the best. We fetch a DOWNSCALED copy for judging — a full-res venue shot would blow
// the model's vision-token budget — but hand back the ORIGINAL URL to embed in the demo. Worker-only
// (relative imports, no `server-only`). Uses the SSRF-guarded safeFetch since the URLs come from a scraped
// public source. Best-effort: any photo that fails to download is skipped, never throws.
export interface VenuePhoto {
  path: string; // local temp file the researcher Reads (downscaled)
  url: string; // original URL to embed in the demo
}

// Google user-content photo URLs end with a size token like "=w1920-h1080-k-no" or "=s1600". Swap it for
// the requested width so the judging copy is small; leave URLs without a recognizable token untouched.
const SIZE_TOKEN = /=(?:s\d+|w\d+(?:-h\d+)?)(?:-[a-z0-9]+)*$/i;
function judgeUrl(rawUrl: string, width: number): string {
  return SIZE_TOKEN.test(rawUrl) ? rawUrl.replace(SIZE_TOKEN, `=w${width}`) : rawUrl;
}

export async function fetchVenuePhotos(
  urls: string[],
  opts?: { max?: number; judgeWidth?: number },
): Promise<VenuePhoto[]> {
  const max = opts?.max ?? 6;
  const judgeWidth = opts?.judgeWidth ?? 640;
  const out: VenuePhoto[] = [];
  for (const raw of urls.slice(0, max)) {
    try {
      const { res } = await safeFetch(judgeUrl(raw, judgeWidth), { timeoutMs: 15_000 });
      if (!res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 1024) continue; // skip tiny/broken responses
      const path = `/tmp/venue-${process.pid}-${Date.now()}-${out.length}.jpg`;
      await writeFile(path, buf);
      out.push({ path, url: raw });
    } catch {
      // best-effort: skip a photo that fails to download
    }
  }
  return out;
}
