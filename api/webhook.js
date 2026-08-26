// Stripe webhook: when a piece is purchased, automatically flip it to "sold"
// in the manifest so it can't be bought twice and shows a Sold ribbon on the
// site without anyone touching the admin page.
//
// Setup:
//   1. Deploy this project.
//   2. In the Stripe Dashboard → Developers → Webhooks, add an endpoint at
//      https://<your-domain>/api/webhook listening for
//      "checkout.session.completed" (and, optionally,
//      "checkout.session.async_payment_succeeded").
//   3. Copy the endpoint's signing secret (starts with "whsec_") into the
//      STRIPE_WEBHOOK_SECRET environment variable on the Vercel project.
//
// Matching a purchase back to a piece:
//   • On-site checkout (/api/checkout) stamps the piece's stable `id` into the
//     session metadata, so those always match.
//   • For any checkout (including Stripe Payment Links), we also match the
//     purchased Price ID against a piece's `stripePriceId`. Set that field on
//     a Payment Link piece too if you want it auto-marked sold.
import Stripe from 'stripe';
import { readManifest, writeManifest } from './_manifest.js';

// Stripe signature verification needs the exact raw bytes, so opt out of
// Vercel's automatic body parsing for this route.
export const config = { api: { bodyParser: false } };

// Sentinel: the payload arrived already parsed into an object, so the exact
// bytes Stripe signed are gone and signature verification cannot succeed.
const RAW_BODY_UNAVAILABLE = 'RAW_BODY_UNAVAILABLE';

async function readRawBody(req) {
  // Defensive: if some layer already buffered the body, reuse it as-is.
  if (Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === 'string') return Buffer.from(req.body, 'utf8');
  // If a body parser turned the payload into an object (bodyParser:false not
  // honored by the platform), the raw bytes are unrecoverable — re-serializing
  // would change whitespace/key order and never match the signature. Fail with
  // a clear, specific error instead of a mysterious "bad signature".
  if (req.body && typeof req.body === 'object') {
    throw new Error(RAW_BODY_UNAVAILABLE);
  }
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

async function markPieceSold(stripe, session) {
  const pieceId = session.metadata && session.metadata.pieceId;

  // Collect the Price IDs actually purchased so we can match Payment Link
  // sales (which carry no metadata from us) as well.
  let priceIds = [];
  try {
    const items = await stripe.checkout.sessions.listLineItems(session.id, { limit: 20 });
    priceIds = items.data.map((li) => li.price && li.price.id).filter(Boolean);
  } catch {
    // If line items can't be fetched we can still match on metadata below.
  }

  const manifest = await readManifest();
  let changed = false;
  const markSold = (list) => (list || []).map((p) => {
    const match = (pieceId && p.id && p.id === pieceId)
      || (p.stripePriceId && priceIds.includes(p.stripePriceId));
    if (match && p.status !== 'sold') {
      changed = true;
      return { ...p, status: 'sold' };
    }
    return p;
  });

  // Both for-sale stores share one id space, so check each.
  manifest.paintings = markSold(manifest.paintings);
  manifest.sculptures = markSold(manifest.sculptures);

  if (changed) await writeManifest(manifest);
  return changed;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const secret = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !webhookSecret) {
    res.status(501).json({ error: 'Webhook not configured (missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET).' });
    return;
  }

  const stripe = new Stripe(secret);

  let event;
  try {
    const raw = await readRawBody(req);
    const signature = req.headers['stripe-signature'];
    event = stripe.webhooks.constructEvent(raw, signature, webhookSecret);
  } catch (err) {
    const message = String((err && err.message) || err);
    if (message === RAW_BODY_UNAVAILABLE) {
      // Deployment-level problem, not a bad request from Stripe: the raw body
      // was consumed before we could read it, so no signature can verify.
      res.status(500).json({
        error: 'Webhook cannot read the raw request body on this deployment, so Stripe signatures can never verify. Ensure this route runs with body parsing disabled (bodyParser:false).',
      });
      return;
    }
    res.status(400).json({ error: `Webhook signature verification failed: ${message}` });
    return;
  }

  try {
    if (event.type === 'checkout.session.completed'
      || event.type === 'checkout.session.async_payment_succeeded') {
      const session = event.data.object;
      // For the sync case require a paid status; the async event only fires on success.
      const paid = event.type === 'checkout.session.async_payment_succeeded'
        || session.payment_status === 'paid';
      if (paid) await markPieceSold(stripe, session);
    }
  } catch (err) {
    // Return 500 so Stripe retries a transient manifest-write failure.
    res.status(500).json({ error: String((err && err.message) || err) });
    return;
  }

  res.status(200).json({ received: true });
}
