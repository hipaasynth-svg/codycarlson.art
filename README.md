# codycarlson.art

A single-page site for artist Cody Carlson (carving, painting, lapidary) —
intake form, an **Available Now** store where finished paintings sell through
Stripe, floating "rolodex" photo carousels, bio, tiered pricing, and a sponsor
footer, all sitting on a **full-screen background slideshow**.

Static HTML/CSS front end with a small set of Vercel serverless functions in
`api/` (photo uploads, the admin manifest, and Stripe checkout). No build step
or framework — open `index.html` directly for the static parts, or deploy the
folder to Vercel so the `api/` routes run.

## Selling paintings (Stripe)

Finished pieces for sale live in the **Paintings for Sale** section of the
admin page (`/admin`) — up to 18 slots, shown on the home page as a carousel.
For each piece you just add a **photo** and a **price** (e.g. `$1,200`):

- The **price you type is what the buyer is charged.** Clicking **Buy Now**
  opens Stripe checkout for that amount via `/api/checkout`, which reads the
  price from the saved manifest server-side (the browser never sends an amount,
  so it can't be tampered with). This needs the `STRIPE_SECRET_KEY` environment
  variable set on the Vercel project (same place as `ADMIN_PASSWORD`).
- No Stripe dashboard work is required. Two optional overrides live under
  **Advanced Stripe options** per piece: a **Payment Link** (`buyUrl`, e.g.
  `https://buy.stripe.com/…` — bypasses `/api/checkout` entirely, needs no
  secret key) or a preset **Price ID** (`stripePriceId`, `price_…`).

If a piece has no price and no Stripe override, its button becomes **Reserve
this piece**, which pre-fills the inquiry form. Set a piece to *Reserved* or
*Sold* to show a ribbon and disable buying. After checkout, buyers return to
`/?purchase=success` (or `?purchase=cancel`), which shows a confirmation banner.

### Auto-mark pieces Sold (webhook)

`api/webhook.js` flips a piece to **Sold** automatically the moment it's
purchased, so nothing can be double-sold. To turn it on:

1. Deploy the project.
2. In Stripe → **Developers → Webhooks**, add an endpoint at
   `https://<your-domain>/api/webhook` listening for
   `checkout.session.completed` (optionally also
   `checkout.session.async_payment_succeeded`).
3. Copy the endpoint's signing secret (`whsec_…`) into the
   `STRIPE_WEBHOOK_SECRET` environment variable on the Vercel project.

Purchases made through **on-site checkout** always match the right piece (its
id travels in the checkout metadata). For **Payment Link** pieces, also fill in
the piece's *Stripe Price ID* field so the webhook can match the sale to it.

## Background slideshow

Add up to 20 full-screen photos under **Background Slideshow** in `/admin` and
they cross-fade behind the site. With one photo it simply shows that photo;
with none it falls back to `backgroundImage` in `js/config.js`. Cross-fade
timing is `backgroundSlideInterval` (ms) in the config. `?bg=https://…` in the
URL still forces a single image for quick previews.

## Editing content

Everything content-related lives in **`js/config.js`**:

- `backgroundImage` — single-image fallback used before any slideshow photos
  are added in `/admin` (see **Background slideshow** above). Drop a file into
  `assets/images/` and point to it here. `?bg=https://...` in the URL forces a
  single image for a quick preview.
- `backgroundSlideInterval` — cross-fade timing (ms) for the slideshow.
- `availableHeading` / `availableIntro` / `availableWork` — heading, intro, and
  the **fallback** list of finished pieces for the Available Now store. The
  store is normally managed from `/admin`; `availableWork` only shows when no
  paintings have been added there yet (see **Selling paintings** above).
- `hero` — the "Books Open" label/subtext and heading.
- `contact` — phone/email used by the Call/Email buttons and footer.
- `form.submitMode` — `"mailto"` (default, opens the visitor's email client,
  zero setup) or `"endpoint"` to POST the intake form as JSON to a backend
  URL (Formspree, Getform, a custom API — set `form.endpoint`).
- `interests` — options in the intake form's interest selector.
- `bio` — artist statement paragraphs and optional portrait photo.
- `pricing` — array of categories, each with tiers (name/price/description).
  Add or remove categories/tiers freely; the layout adapts.
- `sponsors` — real partner badges, each with a name, link, and optional logo
  path (falls back to a text badge if no logo is set). Ships **empty**; the
  whole footer block stays hidden until you add genuine sponsors, since
  placeholder `#` badges read as fake and hurt trust.
- `galleries` / `paintings` / `background` — heading, label, and slot count
  (`max`) for each admin-managed section.

## Rolodex photo uploads

Each rolodex slot has a click-to-upload control. Uploaded photos are stored
as data URLs in the visitor's browser (`localStorage`), so they're an easy
way to preview layouts, but they are **per-browser, not shared with other
visitors**. For production, replace this with permanent images — either:

- Pre-populate `localStorage` on your own device once (uploads persist there
  for you as the admin), or
- Extend `buildRolodex()` in `js/main.js` to read a fixed list of image URLs
  from `config.js` instead of `localStorage`, once you have final photos.

## Suggestions for later

- Add Open Graph/Twitter card images for richer social sharing.
- Add a Stripe webhook to auto-mark a piece **Sold** once it's purchased, so
  inventory can't be double-sold between admin edits.
- Add an Instagram link (`contact.instagram` in `js/config.js`) once the
  account is live — the footer link appears automatically when it's set.
