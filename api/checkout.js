// Creates a Stripe Checkout Session for a finished "Available Now" piece and
// returns its hosted-checkout URL, which the site redirects the buyer to.
//
// Setup: set STRIPE_SECRET_KEY in the Vercel project's Environment Variables
// (same place as ADMIN_PASSWORD). Each piece's amount is controlled by the
// Stripe Price you create in the dashboard and reference by `stripePriceId`
// in js/config.js — the browser only sends the Price ID, never an amount, so
// a visitor can't change what they're charged.
//
// Prefer this route when you want buyers to stay on codycarlson.art. If you'd
// rather not manage a secret key at all, use a Stripe Payment Link instead
// (set `buyUrl` on the piece in js/config.js) — that path never touches this
// function.
import Stripe from 'stripe';

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
  const priceId = typeof body.priceId === 'string' ? body.priceId.trim() : '';
  const title = typeof body.title === 'string' ? body.title.slice(0, 200) : '';

  // Stripe Price IDs always look like "price_…". Reject anything else before
  // calling Stripe so bad input gets a clean 400 instead of a Stripe error.
  if (!/^price_[A-Za-z0-9]+$/.test(priceId)) {
    res.status(400).json({ error: 'Invalid or missing priceId.' });
    return;
  }

  const proto = (req.headers['x-forwarded-proto'] || 'https').toString().split(',')[0];
  const host = req.headers.host;
  const origin = req.headers.origin || `${proto}://${host}`;

  try {
    const stripe = new Stripe(secret);
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: priceId, quantity: 1 }],
      // Physical, one-of-a-kind art — collect a shipping address and cap
      // quantity at one so the same piece can't be bought twice in a cart.
      shipping_address_collection: { allowed_countries: ['US', 'CA'] },
      success_url: `${origin}/?purchase=success`,
      cancel_url: `${origin}/?purchase=cancel`,
      metadata: title ? { piece: title } : undefined,
    });
    res.status(200).json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: 'Could not start checkout', detail: String((err && err.message) || err) });
  }
}
