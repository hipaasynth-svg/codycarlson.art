// Shared manifest helpers. The manifest is a single small JSON file stored
// in Vercel Blob at a fixed path, holding which photo URLs belong to which
// gallery plus the collaborator section's content. It's the one thing the
// admin "Save" button writes, and the one thing the public site reads.
import { head } from '@vercel/blob';

export const MANIFEST_PATH = 'data/manifest.json';

export const EMPTY_MANIFEST = {
  galleries: { featured: [], studio: [], stones: [], silverRings: [] },
  collaborator: { photo: '', headline: '', bio: '' },
};

export async function readManifest() {
  try {
    const meta = await head(MANIFEST_PATH);
    const res = await fetch(meta.url, { cache: 'no-store' });
    if (!res.ok) return EMPTY_MANIFEST;
    const data = await res.json();
    return {
      galleries: { ...EMPTY_MANIFEST.galleries, ...(data.galleries || {}) },
      collaborator: { ...EMPTY_MANIFEST.collaborator, ...(data.collaborator || {}) },
    };
  } catch {
    // No manifest saved yet — that's expected before the first Save.
    return EMPTY_MANIFEST;
  }
}
