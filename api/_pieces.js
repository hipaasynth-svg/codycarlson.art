// Shared helpers for the per-piece pages (/piece/<slug>) and the dynamic
// sitemap. Slugs are DERIVED from the live manifest here — never stored — so a
// piece's URL updates if its title changes, and the same function is the single
// source of truth for the public gallery response, the piece route, and the
// sitemap. That keeps the links the homepage renders and the routes the server
// resolves perfectly in sync.

// The canonical public origin. Override with SITE_URL on Vercel if the domain
// ever changes; absolute URLs are required for canonical/OG tags and sitemaps.
export const SITE_URL = (process.env.SITE_URL || 'https://codycarlson.art').replace(/\/+$/, '');

// "Great American Buffalo" -> "great-american-buffalo"
export function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
}

// A short, stable fragment of a piece's id, used to disambiguate two pieces
// that would otherwise slugify to the same URL.
function idFragment(id) {
  return String(id || '').replace(/[^a-z0-9]/gi, '').slice(-5).toLowerCase() || 'piece';
}

// Flatten both for-sale stores into one list. `store` marks where each came
// from; the id space is shared across both (checkout relies on that too).
export function allPieces(manifest) {
  const paintings = Array.isArray(manifest.paintings) ? manifest.paintings : [];
  const sculptures = Array.isArray(manifest.sculptures) ? manifest.sculptures : [];
  return [
    ...paintings.map((p) => ({ ...p, store: 'paintings' })),
    ...sculptures.map((p) => ({ ...p, store: 'sculptures' })),
  ].filter((p) => p && p.url);
}

// Assign each piece a unique `slug`. A title-based slug is used when it's
// unique across the whole catalog; on a collision (or an empty title) the id
// fragment is appended so every piece still resolves to exactly one URL.
export function withSlugs(manifest) {
  const pieces = allPieces(manifest);
  const baseCount = new Map();
  for (const p of pieces) {
    const base = slugify(p.title) || 'piece';
    baseCount.set(base, (baseCount.get(base) || 0) + 1);
  }
  return pieces.map((p) => {
    const base = slugify(p.title) || 'piece';
    const slug = baseCount.get(base) > 1 ? `${base}-${idFragment(p.id)}` : base;
    return { ...p, slug };
  });
}

// Resolve a URL segment to a piece: match the derived slug first, then fall
// back to the raw id so older/hand-made links keep working.
export function findPiece(manifest, segment) {
  const wanted = String(segment || '').toLowerCase();
  const pieces = withSlugs(manifest);
  return pieces.find((p) => p.slug === wanted) || pieces.find((p) => String(p.id).toLowerCase() === wanted) || null;
}

// Escape for HTML text and double-quoted attribute values.
export function escapeHtml(str) {
  return String(str == null ? '' : str).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

// Show the price with a leading "$" unless a currency symbol is already typed.
export function formatPrice(price) {
  const t = String(price == null ? '' : price).trim();
  if (!t) return '';
  return /^[$€£]/.test(t) ? t : `$${t}`;
}

// "$1,200" -> 1200 (number), or null if it can't be parsed.
export function priceToNumber(price) {
  const n = parseFloat(String(price == null ? '' : price).replace(/[^0-9.]/g, ''));
  return isFinite(n) && n > 0 ? n : null;
}

// Whether a piece can be bought right now.
export function isBuyable(piece) {
  return (piece.status || 'available').toLowerCase() === 'available';
}
