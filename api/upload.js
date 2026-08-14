// Uploads a single photo to Vercel Blob storage. The admin page compresses
// images in the browser first (see admin.js) so this request stays well
// under Vercel's 4.5MB body limit for serverless functions.
import { put } from '@vercel/blob';
import { isAuthorized } from './_auth.js';

const ALLOWED_FOLDERS = new Set(['featured', 'studio', 'stones', 'silverRings', 'collaborator', 'bio']);
const MAX_DECODED_BYTES = 8 * 1024 * 1024; // 8MB safety cap after decoding

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (!isAuthorized(req)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { dataUrl, folder } = req.body || {};
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
    res.status(400).json({ error: 'Missing or invalid dataUrl' });
    return;
  }
  if (!ALLOWED_FOLDERS.has(folder)) {
    res.status(400).json({ error: 'Invalid folder' });
    return;
  }

  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    res.status(400).json({ error: 'Malformed data URL' });
    return;
  }
  const [, contentType, base64] = match;
  const buffer = Buffer.from(base64, 'base64');
  if (buffer.byteLength > MAX_DECODED_BYTES) {
    res.status(413).json({ error: 'Image too large' });
    return;
  }

  const extension = contentType.split('/')[1] || 'jpg';
  const pathname = `gallery/${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;

  try {
    const blob = await put(pathname, buffer, {
      access: 'public',
      contentType,
      addRandomSuffix: false,
    });
    res.status(200).json({ url: blob.url });
  } catch (err) {
    res.status(500).json({ error: 'Upload failed', detail: String(err && err.message || err) });
  }
}
