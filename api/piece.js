// Server-rendered detail page for one finished piece: /piece/<slug>.
//
// A Vercel rewrite maps /piece/<slug> to this function (see vercel.json). It
// reads the LIVE manifest, finds the piece, and returns a complete HTML page —
// full meta/Open Graph/JSON-LD plus visible content — so search engines, social
// unfurls, and AI answer engines see the artwork without running any JavaScript.
// Edge-cached briefly (like /api/gallery) so it stays fast and fresh.
import { readManifest } from './_manifest.js';
import {
  SITE_URL, findPiece, escapeHtml, formatPrice, priceToNumber, isBuyable,
} from './_pieces.js';

export default async function handler(req, res) {
  const slug = (req.query && (req.query.slug || req.query.id)) || '';

  let manifest;
  try {
    manifest = await readManifest();
  } catch {
    manifest = null;
  }

  const piece = manifest ? findPiece(manifest, slug) : null;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  if (!piece) {
    res.setHeader('Cache-Control', 'public, s-maxage=30');
    res.status(404).send(renderNotFound());
    return;
  }

  // Same edge-cache posture as /api/gallery: most views are served instantly
  // from cache; a price/status change shows within ~a minute, no redeploy.
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=600');
  res.status(200).send(renderPiece(piece));
}

export function renderPiece(piece) {
  const title = (piece.title || 'Original artwork').trim();
  const medium = (piece.medium || '').trim();
  const size = (piece.size || '').trim();
  const story = (piece.story || '').trim();
  const priceText = formatPrice(piece.price);
  const status = (piece.status || 'available').toLowerCase();
  const buyable = isBuyable(piece);
  const url = `${SITE_URL}/piece/${piece.slug}`;
  const img = piece.url;

  const metaBits = [medium, size].filter(Boolean).join(', ');
  // Custom alt/SEO line from /admin wins for the image alt; else auto-build it.
  const imgAlt = (piece.alt || '').trim() || altText(title, metaBits);
  // Description used for <meta>, Open Graph, and the search snippet.
  const description = truncate(
    story || [title, metaBits, priceText && `${priceText}`].filter(Boolean).join(' — ')
      || `An original work by Cody Carlson.`,
    300,
  );

  const priceNum = priceToNumber(piece.price);
  const availability = buyable ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock';

  // Product structured data. Offers are included only when there's a real
  // price to state; availability tracks the piece's live status.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'VisualArtwork',
    name: title,
    image: img,
    url,
    creator: { '@type': 'Person', name: 'Cody Carlson' },
    ...(medium ? { artMedium: medium } : {}),
    ...(size ? { size } : {}),
    ...(story ? { description: story } : {}),
    ...(priceNum ? {
      offers: {
        '@type': 'Offer',
        price: String(priceNum),
        priceCurrency: 'USD',
        availability,
        url,
        seller: { '@type': 'Person', name: 'Cody Carlson' },
      },
    } : {}),
  };

  const buyMarkup = renderBuy(piece, buyable, status, priceText);

  const metaLine = metaBits ? `<p class="pd-meta">${escapeHtml(metaBits)}</p>` : '';
  const priceLine = priceText
    ? `<p class="pd-price">${escapeHtml(priceText)}${buyable ? '' : ` <span class="pd-flag">${status === 'sold' ? 'Sold' : 'Reserved'}</span>`}</p>`
    : (buyable ? '' : `<p class="pd-price"><span class="pd-flag">${status === 'sold' ? 'Sold' : 'Reserved'}</span></p>`);
  const storyMarkup = story
    ? `<div class="pd-story">${story.split(/\n{2,}/).map((p) => `<p>${escapeHtml(p.trim())}</p>`).join('')}</div>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)} — Cody Carlson</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <link rel="canonical" href="${escapeHtml(url)}" />
  <meta name="robots" content="index, follow, max-image-preview:large" />

  <meta property="og:type" content="product" />
  <meta property="og:site_name" content="Cody Carlson" />
  <meta property="og:title" content="${escapeHtml(title)} — Cody Carlson" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:url" content="${escapeHtml(url)}" />
  <meta property="og:image" content="${escapeHtml(img)}" />
  <meta property="og:image:alt" content="${escapeHtml(imgAlt)}" />
  ${priceNum ? `<meta property="product:price:amount" content="${priceNum}" />
  <meta property="product:price:currency" content="USD" />
  <meta property="product:availability" content="${buyable ? 'in stock' : 'out of stock'}" />` : ''}

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)} — Cody Carlson" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(img)}" />

  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='45' fill='%23151312'/%3E%3Ctext x='50' y='66' font-size='55' text-anchor='middle' fill='%23c8a869' font-family='Georgia,serif'%3ECC%3C/text%3E%3C/svg%3E" />

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/css/styles.css" />
  <link rel="stylesheet" href="/css/piece.css" />

  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
</head>
<body class="piece-page">
  <div class="pd-bg" aria-hidden="true"></div>

  <header class="pd-topbar">
    <a class="pd-brand" href="/">Cody Carlson</a>
    <a class="pd-back" href="/#available">← All work</a>
  </header>

  <main class="pd-main">
    <article class="pd-card">
      <div class="pd-media">
        <img src="${escapeHtml(img)}" alt="${escapeHtml(imgAlt)}" />
        ${buyable ? '' : `<span class="pd-ribbon">${status === 'sold' ? 'Sold' : 'Reserved'}</span>`}
      </div>
      <div class="pd-info">
        <h1 class="pd-title">${escapeHtml(title)}</h1>
        ${metaLine}
        ${priceLine}
        ${buyMarkup}
        ${storyMarkup}
        <p class="pd-return"><a href="/#available">← Back to all available work</a></p>
      </div>
    </article>
  </main>

  <footer class="pd-footer">
    <a href="mailto:cody@codycarlson.art">cody@codycarlson.art</a>
    <span aria-hidden="true">·</span>
    <a href="tel:+17013895644">(701) 389-5644</a>
  </footer>

  <script>${buyScript()}</script>
</body>
</html>`;
}

function renderBuy(piece, buyable, status, priceText) {
  if (!buyable) {
    const label = status === 'sold' ? 'Sold' : 'Reserved';
    return `<div class="pd-buy"><button type="button" class="btn btn-primary pd-buy-btn" disabled>${label}</button></div>`;
  }
  // A Stripe Payment Link wins if present — a plain outbound link.
  if (piece.buyUrl) {
    return `<div class="pd-buy"><a class="btn btn-primary pd-buy-btn" href="${escapeHtml(piece.buyUrl)}">Buy Now</a></div>`;
  }
  // Otherwise on-site checkout by id (price is looked up server-side). The
  // button's data-id drives the small inline script below.
  if (piece.id && (piece.price || piece.stripePriceId)) {
    return `<div class="pd-buy"><button type="button" class="btn btn-primary pd-buy-btn" data-buy-id="${escapeHtml(piece.id)}">Buy Now</button></div>`;
  }
  // No price/Stripe yet — send them to the inquiry form to reserve it.
  return `<div class="pd-buy"><a class="btn btn-primary pd-buy-btn" href="/#intake-form">Reserve this piece</a></div>`;
}

// Minimal client script: start on-site checkout, fall back to the inquiry form.
function buyScript() {
  return `
  (function(){
    var btn = document.querySelector('[data-buy-id]');
    if (!btn) return;
    btn.addEventListener('click', async function(){
      var id = btn.getAttribute('data-buy-id');
      var label = btn.textContent;
      btn.disabled = true; btn.textContent = 'Starting checkout…';
      try {
        var res = await fetch('/api/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pieceId: id }),
        });
        var data = await res.json().catch(function(){ return {}; });
        if (!res.ok || !data.url) throw new Error(data.error || 'unavailable');
        window.location.href = data.url;
      } catch (e) {
        // Checkout not configured (or failed) — don't lose the sale.
        window.location.href = '/#intake-form';
      }
    });
  })();`;
}

function altText(title, metaBits) {
  return metaBits ? `${title} — ${metaBits}, by Cody Carlson` : `${title}, by Cody Carlson`;
}

function truncate(str, max) {
  const s = String(str || '').replace(/\s+/g, ' ').trim();
  return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s;
}

function renderNotFound() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Piece not found — Cody Carlson</title>
  <meta name="robots" content="noindex" />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600&family=Inter:wght@400;500&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/css/styles.css" />
  <link rel="stylesheet" href="/css/piece.css" />
</head>
<body class="piece-page">
  <div class="pd-bg" aria-hidden="true"></div>
  <main class="pd-main pd-404">
    <h1>This piece isn't here</h1>
    <p>It may have sold, or the link may be out of date.</p>
    <p><a class="btn btn-primary" href="/#available">See available work</a></p>
  </main>
</body>
</html>`;
}
