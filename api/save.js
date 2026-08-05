// The admin page's Save button hits this route with the full desired state
// (which photo URLs are in which gallery, plus the collaborator content).
// It overwrites the single manifest.json blob the public site reads from.
import { put } from '@vercel/blob';
import { isAuthorized } from './_auth.js';
import { MANIFEST_PATH, EMPTY_MANIFEST } from './_manifest.js';

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

  const collab = body.collaborator || {};
  const collaborator = {
    photo: typeof collab.photo === 'string' ? collab.photo : '',
    headline: typeof collab.headline === 'string' ? collab.headline.slice(0, 200) : '',
    bio: typeof collab.bio === 'string' ? collab.bio.slice(0, 2000) : '',
  };

  const manifest = { galleries, collaborator };

  try {
    await put(MANIFEST_PATH, JSON.stringify(manifest), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Save failed', detail: String(err && err.message || err) });
  }
}
