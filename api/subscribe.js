// Mailing-list signup endpoint.
//
// Subscriber emails are personal data, so — unlike the photo/price manifest —
// they are NOT written to the site's public Vercel Blob store (a public blob at
// a known path would expose the list). Instead this forwards each address to
// the studio inbox via FormSubmit, the same service the commission intake form
// already uses: private, and needing no extra secrets.
//
// Upgrade path: to build an owned, sendable list (automated announcements),
// swap this forward for a real ESP API call (Buttondown, Mailchimp, etc.) — the
// front-end contract (`POST { email }` → `{ ok: true }`) stays the same, so
// only this file changes.

const FORMSUBMIT_ENDPOINT = 'https://formsubmit.co/ajax/cody@codycarlson.art';
// Same permissive shape the client checks: something@something.tld.
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const body = req.body || {};
  const email = typeof body.email === 'string' ? body.email.trim().slice(0, 254) : '';
  // Honeypot: the form's hidden `company` field is empty for real people. A
  // filled one is almost certainly a bot — accept it silently (so the bot sees
  // success) without forwarding anything.
  const honeypot = typeof body.company === 'string' ? body.company.trim() : '';

  if (!EMAIL_RE.test(email)) {
    res.status(400).json({ error: 'Please provide a valid email address.' });
    return;
  }
  if (honeypot) {
    res.status(200).json({ ok: true });
    return;
  }

  try {
    const upstream = await fetch(FORMSUBMIT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        email,
        _subject: 'New mailing-list signup',
        _template: 'table',
      }),
    });
    if (!upstream.ok) throw new Error(`upstream ${upstream.status}`);
    res.status(200).json({ ok: true });
  } catch (err) {
    // Don't leak upstream detail to the visitor; the client shows a retry hint.
    res.status(502).json({ error: 'Could not add you right now. Please try again shortly.' });
  }
}
