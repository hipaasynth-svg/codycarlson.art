// The admin page's Save button hits this route with the full desired state
// (which photo URLs are in which gallery, plus the collaborator content).
// It overwrites the single manifest.json blob the public site reads from.
import { isAuthorized } from './_auth.js';
import { EMPTY_MANIFEST, writeManifest } from './_manifest.js';

const GALLERY_KEYS = Object.keys(EMPTY_MANIFEST.galleries);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (!isAuthorized(req)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const body = req.body || {};
  const galleries = {};
  for (const key of GALLERY_KEYS) {
    const list = Array.isArray(body.galleries?.[key]) ? body.galleries[key] : [];
    galleries[key] = list.filter((url) => typeof url === 'string' && url.length > 0);
  }

  // Background slideshow — a plain list of photo URLs (max 20).
  const background = (Array.isArray(body.background) ? body.background : [])
    .filter((url) => typeof url === 'string' && url.length > 0)
    .slice(0, 20);

  // For-sale stores — each item carries its own photo, price, and Stripe link.
  // Sanitize every field and keep only items that actually have a photo. The
  // sculptures and paintings stores share the exact same object shape.
  const str = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');
  const newId = () => `p_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const ALLOWED_STATUS = new Set(['available', 'reserved', 'sold']);
  const sanitizePieces = (list, max) => (Array.isArray(list) ? list : [])
    .filter((p) => p && typeof p.url === 'string' && p.url.length > 0)
    .slice(0, max)
    .map((p) => ({
      // Stable id so a Stripe purchase can be matched back to this piece.
      id: (typeof p.id === 'string' && p.id) ? p.id.slice(0, 64) : newId(),
      url: p.url,
      title: str(p.title, 200),
      medium: str(p.medium, 100),
      size: str(p.size, 60),
      // Short story shown on the piece's own page and used as its search
      // description.
      story: str(p.story, 2000),
      price: str(p.price, 60),
      buyUrl: str(p.buyUrl, 500),
      stripePriceId: str(p.stripePriceId, 200),
      status: ALLOWED_STATUS.has(p.status) ? p.status : 'available',
    }));

  const paintings = sanitizePieces(body.paintings, 18);
  const sculptures = sanitizePieces(body.sculptures, 8);

  const collab = body.collaborator || {};
  const collaborator = {
    photo: typeof collab.photo === 'string' ? collab.photo : '',
    headline: typeof collab.headline === 'string' ? collab.headline.slice(0, 200) : '',
    bio: typeof collab.bio === 'string' ? collab.bio.slice(0, 2000) : '',
  };

  const bioIn = body.bio || {};
  const bio = { photo: typeof bioIn.photo === 'string' ? bioIn.photo : '' };

  const manifest = { galleries, background, paintings, sculptures, collaborator, bio };

  try {
    await writeManifest(manifest);
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Save failed', detail: String(err && err.message || err) });
  }
}
