// Public, read-only endpoint the live site polls on load to find out which
// photos exist right now. No password needed — this is what visitors see.
import { readManifest } from './_manifest.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const manifest = await readManifest();
  res.status(200).json(manifest);
}
