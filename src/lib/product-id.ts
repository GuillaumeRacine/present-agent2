/**
 * Build a stable product_id for ingestion to enforce uniqueness across imports.
 * Preference order:
 * 1) vendor + sku
 * 2) vendor + normalized URL (hostname + path)
 * 3) generated fallback using provided fallbackId
 */
export function buildProductId(options: {
  vendor?: string | null;
  sku?: string | null;
  url?: string | null;
  fallbackId: string;
}): string {
  const vendor = options.vendor?.trim().toLowerCase() || '';
  const sku = options.sku?.trim() || '';
  const url = options.url?.trim() || '';

  if (vendor && sku) {
    return `${vendor}::${sku}`;
  }

  if (vendor && url) {
    const normalizedUrl = normalizeUrl(url);
    return `${vendor}::${normalizedUrl}`;
  }

  if (url) {
    const normalizedUrl = normalizeUrl(url);
    return `generated::${normalizedUrl}`;
  }

  return `generated::${options.fallbackId}`;
}

function normalizeUrl(raw: string): string {
  try {
    const parsed = new URL(raw);
    // Keep hostname + path without trailing slash to keep IDs stable
    const path = parsed.pathname?.replace(/\/$/, '') || '';
    return `${parsed.hostname}${path}`;
  } catch {
    // If URL parsing fails, fall back to a trimmed string
    return raw.trim().replace(/\/$/, '');
  }
}
