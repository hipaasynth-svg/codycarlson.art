// Public, read-only endpoint the live site polls on load to find out which
// photos exist right now. No password needed — this is what visitors see.
import { readManifest } from './_manifest.js';

export default async function handler(req, res) {
  // Cache the manifest at Vercel's edge so most visitors get it instantly
  // without spinning up this function. It changes only when the admin saves;
  // stale-while-revalidate serves the cached copy for up to a minute while a
  // fresh one is fetched in the background. The admin page bypasses this with
  // a cache-busting query so it always sees its latest save immediately.
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=600');
  const manifest = await readManifest();
  res.status(200).json(manifest);
}
