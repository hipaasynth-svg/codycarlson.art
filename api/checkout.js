// Creates a Stripe Checkout Session for a finished "Available Now" piece and
// returns its hosted-checkout URL, which the site redirects the buyer to.
//
// The amount charged is derived SERVER-SIDE from the piece in the saved
// manifest — the browser only sends the piece's id, never a price — so a
// visitor can't change what they're charged. In order of preference for a
// piece, this uses:
//   1. its `stripePriceId` (a Price you made in the Stripe Dashboard), else
//   2. the `price` you typed in /admin (e.g. "$1,200"), charged as-is.
// So just adding a photo + price in /admin makes a piece buyable — no Stripe
// dashboard work needed. (Setting STRIPE_SECRET_KEY in the Vercel project is
// still required for on-site checkout; a Stripe Payment Link `buyUrl` bypasses
// this route entirely.)
import Stripe from 'stripe';
import { readManifest } from './_manifest.js';

// "$1,200" -> 120000 (cents). Returns null if it can't be parsed to a usable
// amount. Stripe's minimum charge is 50 cents.
function priceToCents(str) {
  if (typeof str !== 'string' && typeof str !== 'number') return null;
  const n = parseFloat(String(str).replace(/[^0-9.]/g, ''));
  if (!isFinite(n) || n <= 0) return null;
  const cents = Math.round(n * 100);
  return cents >= 50 ? cents : null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    // Fail clearly so setup problems are self-explanatory rather than a
    // generic 500. The button falls back to the inquiry form on the client.
    res.status(501).json({ error: 'Checkout is not configured yet (missing STRIPE_SECRET_KEY).' });
    return;
  }

  const body = req.body || {};
  const pieceId = typeof body.pieceId === 'string' ? body.pieceId.slice(0, 64) : '';
  if (!pieceId) {
    res.status(400).json({ error: 'Missing pieceId.' });
    return;
  }

  // Look the piece up in the saved manifest — the trusted source of its price.
  // Both for-sale stores (sculptures + paintings) share one id space.
  let piece = null;
  try {
    const manifest = await readManifest();
    const inventory = [...(manifest.sculptures || []), ...(manifest.paintings || [])];
    piece = inventory.find((p) => p && p.id === pieceId) || null;
  } catch {
    res.status(500).json({ error: 'Could not load inventory.' });
    return;
  }
  if (!piece) {
    res.status(404).json({ error: 'Piece not found.' });
    return;
  }
  if ((piece.status || 'available').toLowerCase() !== 'available') {
    res.status(409).json({ error: 'This piece is no longer available.' });
    return;
  }

  const imageUrl = typeof piece.url === 'string' && /^https?:\/\//i.test(piece.url)
    ? piece.url
    : null;

  // Build the line item: a preset Stripe Price wins; otherwise charge the
  // typed price. Both come from the server-side manifest, never the client.
  let lineItem = null;
  if (typeof piece.stripePriceId === 'string' && /^price_[A-Za-z0-9]+$/.test(piece.stripePriceId)) {
    lineItem = { price: piece.stripePriceId, quantity: 1 };
  } else {
    const cents = priceToCents(piece.price);
    if (!cents) {
      res.status(400).json({ error: 'This piece has no valid price set.' });
      return;
    }
    const productData = { name: piece.title || 'Original artwork' };
    if (imageUrl) productData.images = [imageUrl];
    // Give the buyer context on the checkout page: medium and/or dimensions.
    const description = [piece.medium, piece.size && `Size: ${piece.size}`]
      .filter(Boolean)
      .join(' · ');
    if (description) productData.description = description;
    lineItem = {
      price_data: {
        currency: 'usd',
        unit_amount: cents,
        product_data: productData,
      },
      quantity: 1,
    };
  }

  const proto = (req.headers['x-forwarded-proto'] || 'https').toString().split(',')[0];
  const host = req.headers.host;
  const origin = req.headers.origin || `${proto}://${host}`;

  try {
    const stripe = new Stripe(secret);
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [lineItem],
      // Physical, one-of-a-kind art — collect a shipping address.
      shipping_address_collection: { allowed_countries: ['US', 'CA'] },
      success_url: `${origin}/?purchase=success`,
      cancel_url: `${origin}/?purchase=cancel`,
      // Stamp the piece so the webhook can flip exactly this piece to "sold".
      metadata: { pieceId, ...(piece.title ? { piece: piece.title } : {}) },
    });
    res.status(200).json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: 'Could not start checkout', detail: String((err && err.message) || err) });
  }
}
