// Server-rendered homepage. The site's hero, bio, and pricing are STATIC text
// (from js/config.js) but were only injected client-side, so a crawler or AI
// engine that doesn't run JavaScript saw empty placeholders. This function bakes
// that text — plus real contact links — into the HTML the server sends, so the
// front page is first-class indexable content, not a <noscript> fallback. The
// client script still runs and re-fills the same nodes idempotently, so real
// visitors see no change.
//
// A Vercel rewrite maps / (and /index.html) to this function; vercel.json's
// `functions.includeFiles` bundles index.html and js/config.js alongside it.
import fs from 'node:fs';
import { escapeHtml } from './_pieces.js';

const INDEX_URL = new URL('../index.html', import.meta.url);
const CONFIG_URL = new URL('../js/config.js', import.meta.url);

// js/config.js is a plain browser script that assigns `window.SITE_CONFIG`.
// Run it in a bare sandbox to read that object server-side, so config.js stays
// the single source of truth (no duplicated copy of the bio/pricing here).
function loadConfig() {
  const src = fs.readFileSync(CONFIG_URL, 'utf8');
  const win = {};
  // eslint-disable-next-line no-new-func
  new Function('window', src)(win);
  return win.SITE_CONFIG || {};
}

// Inject inner HTML into the (empty) element carrying id="ID". Matches from the
// id through the rest of the opening tag to its `>`, then the immediately
// following close tag — so it works whether id is the last attribute
// (`id="hero-heading">`) or is followed by others (`id="footer-email" href=…>`).
function fillEmpty(html, id, inner) {
  if (!inner) return html;
  const re = new RegExp(`(id="${id}"[^>]*>)(\\s*</)`);
  return html.replace(re, (m, open, close) => `${open}${inner}${close}`);
}

// Replace a placeholder `id="ID" href="#"` with a real href.
function setHref(html, id, href) {
  if (!href) return html;
  return html.replace(new RegExp(`(id="${id}")\\s+href="#"`), `$1 href="${escapeHtml(href)}"`);
}

function renderPricingGrid(pricing) {
  if (!Array.isArray(pricing)) return '';
  return pricing.map((cat) => {
    const heading = `<h3>${escapeHtml(cat.category || '')}</h3>`;
    let rows = '';
    if (Array.isArray(cat.tiers)) {
      rows = cat.tiers.map((tier) => `
          <div class="pricing-tier">
            <div class="tier-head">
              <span class="tier-name">${escapeHtml(tier.name || '')}</span>
              <span class="tier-price">${escapeHtml(tier.price || '')}</span>
            </div>
            <p class="tier-desc">${escapeHtml(tier.description || '')}</p>
          </div>`).join('');
    } else if (cat.rate) {
      rows = `
          <div class="pricing-tier pricing-rate">
            <div class="tier-head">
              <span class="tier-price rate-price">${escapeHtml(cat.rate)}</span>
            </div>
            ${cat.description ? `<p class="tier-desc">${escapeHtml(cat.description)}</p>` : ''}
          </div>`;
    }
    return `<div class="pricing-category">${heading}${rows}</div>`;
  }).join('');
}

function renderOfferingsGrid(offerings) {
  if (!Array.isArray(offerings)) return '';
  return offerings.map((o) => `
        <article class="offering-card">
          <h3 class="offering-title">${escapeHtml(o.title || '')}</h3>
          ${o.description ? `<p class="offering-desc">${escapeHtml(o.description)}</p>` : ''}
          ${o.deposit ? `
          <div class="offering-deposit">
            <span class="offering-deposit-label">Required deposit</span>
            <span class="offering-deposit-amount">${escapeHtml(o.deposit)}</span>
            ${o.depositNote ? `<span class="offering-deposit-note">${escapeHtml(o.depositNote)}</span>` : ''}
          </div>` : ''}
          <a class="btn btn-primary offering-cta" href="#intake-form">${escapeHtml(o.cta || 'Start an inquiry')}</a>
        </article>`).join('');
}

function prerender(html, cfg) {
  const hero = cfg.hero || {};
  const bio = cfg.bio || {};
  const contact = cfg.contact || {};
  const telHref = contact.phone ? `tel:${String(contact.phone).replace(/[^\d+]/g, '')}` : '';
  const mailHref = contact.email ? `mailto:${contact.email}` : '';

  const bioParas = Array.isArray(bio.paragraphs)
    ? bio.paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join('')
    : '';

  let out = html;
  // Hero + availability
  out = fillEmpty(out, 'availability-subtext', escapeHtml(hero.availabilitySubtext || ''));
  out = fillEmpty(out, 'hero-heading', escapeHtml(hero.heading || ''));
  out = fillEmpty(out, 'hero-subheading', escapeHtml(hero.subheading || ''));
  // Bio
  out = fillEmpty(out, 'bio-heading', escapeHtml(bio.heading || ''));
  out = fillEmpty(out, 'bio-paragraphs', bioParas);
  // Pricing
  out = fillEmpty(out, 'pricing-note', escapeHtml(cfg.pricingNote || ''));
  out = fillEmpty(out, 'pricing-grid', renderPricingGrid(cfg.pricing));
  // Bookable services (demos + on-site carving)
  out = fillEmpty(out, 'offerings-heading', escapeHtml(cfg.offeringsHeading || ''));
  out = fillEmpty(out, 'offerings-grid', renderOfferingsGrid(cfg.offerings));
  // Real contact links (were href="#", filled by JS) so they work without JS.
  out = setHref(out, 'call-btn', telHref);
  out = setHref(out, 'email-btn', mailHref);
  out = setHref(out, 'footer-email', mailHref);
  out = setHref(out, 'footer-phone', telHref);
  out = fillEmpty(out, 'footer-email', escapeHtml(contact.email || ''));
  out = fillEmpty(out, 'footer-phone', escapeHtml(contact.phoneDisplay || contact.phone || ''));
  return out;
}

export default function handler(req, res) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  // The prerendered HTML doesn't vary by request, so cache it at the edge like
  // the other routes; it changes only when config.js is deployed.
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');

  let html = '';
  try {
    html = fs.readFileSync(INDEX_URL, 'utf8');
  } catch (err) {
    // Can't read the template — nothing to serve.
    res.status(500).send('<!doctype html><meta charset="utf-8"><title>Cody Carlson</title>Temporarily unavailable.');
    return;
  }

  try {
    html = prerender(html, loadConfig());
  } catch (err) {
    // Prerender failed — serve the plain template. The client script still
    // fills the content, so the page is fully functional either way.
  }

  res.status(200).send(html);
}

// Exported for tests.
export { prerender, renderPricingGrid };
