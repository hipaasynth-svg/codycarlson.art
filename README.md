# codycarlson.art

A single-page site for artist Cody Carlson (carving, painting, lapidary) —
intake form, two floating "rolodex" photo carousels, bio, tiered pricing, and
a sponsor footer, all sitting on a full-screen background image.

Static HTML/CSS/JS, no build step or framework — open `index.html` directly
or serve the folder with any static host (GitHub Pages, Netlify, Vercel, etc).

## Editing content

Everything content-related lives in **`js/config.js`**:

- `backgroundImage` — path to the full-screen background photo. Drop a file
  into `assets/images/` and point to it here. For a quick one-off preview
  without editing the file, load the page with `?bg=https://...` in the URL.
- `hero` — the "Books Open" label/subtext and heading.
- `contact` — phone/email used by the Call/Email buttons and footer.
- `form.submitMode` — `"mailto"` (default, opens the visitor's email client,
  zero setup) or `"endpoint"` to POST the intake form as JSON to a backend
  URL (Formspree, Getform, a custom API — set `form.endpoint`).
- `interests` — options in the intake form's interest selector.
- `bio` — artist statement paragraphs and optional portrait photo.
- `pricing` — array of categories, each with tiers (name/price/description).
  Add or remove categories/tiers freely; the layout adapts.
- `sponsors` — 4–6 badges, each with a name, link, and optional logo path
  (falls back to a text badge if no logo is set).
- `rolodex` — slot counts for the main (10) and secondary (6) carousels.

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

- Wire `form.endpoint` up to a real backend so inquiries land in an inbox or
  CRM instead of relying on the visitor's email client.
- Replace the localStorage-based rolodex uploads with real hosted images
  once photography is final (see above).
- Add Open Graph/Twitter card images and a real favicon for social sharing.
- Consider a "sold" ribbon or availability tag per piece if inventory should
  be reflected on the page.
