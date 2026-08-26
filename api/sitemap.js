// Dynamic sitemap. Lists the homepage plus every current piece's detail page,
// read from the live manifest — so each artwork is discoverable by search
// engines as soon as Cody adds it in /admin, with no redeploy. A Vercel rewrite
// maps /sitemap.xml to this function (see vercel.json).
import { readManifest } from './_manifest.js';
import { SITE_URL, withSlugs, escapeHtml } from './_pieces.js';

export default async function handler(req, res) {
  let pieces = [];
  try {
    pieces = withSlugs(await readManifest());
  } catch {
    pieces = [];
  }

  const urls = [
    { loc: `${SITE_URL}/`, changefreq: 'weekly', priority: '1.0' },
    ...pieces.map((p) => ({
      loc: `${SITE_URL}/piece/${p.slug}`,
      changefreq: 'weekly',
      priority: '0.8',
    })),
  ];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url>
    <loc>${escapeHtml(u.loc)}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
  res.status(200).send(body);
}
