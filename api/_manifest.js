// Shared manifest helpers. The manifest is a single small JSON file stored
// in Vercel Blob at a fixed path, holding which photo URLs belong to which
// gallery plus the collaborator section's content. It's the one thing the
// admin "Save" button writes, and the one thing the public site reads.
import { head, put } from '@vercel/blob';

export const MANIFEST_PATH = 'data/manifest.json';

export const EMPTY_MANIFEST = {
  galleries: { featured: [], studio: [], stones: [], silverRings: [] },
  // Full-screen background slideshow images (array of photo URLs).
  background: [],
  // Finished paintings for sale — array of { url, title, medium, size, price,
  // buyUrl, stripePriceId, status } objects, managed from /admin.
  paintings: [],
  collaborator: { photo: '', headline: '', bio: '' },
  bio: { photo: '' },
};

export async function readManifest() {
  try {
    const meta = await head(MANIFEST_PATH);
    const res = await fetch(meta.url, { cache: 'no-store' });
    if (!res.ok) return EMPTY_MANIFEST;
    const data = await res.json();
    return {
      galleries: { ...EMPTY_MANIFEST.galleries, ...(data.galleries || {}) },
      background: Array.isArray(data.background) ? data.background : [],
      paintings: Array.isArray(data.paintings) ? data.paintings : [],
      collaborator: { ...EMPTY_MANIFEST.collaborator, ...(data.collaborator || {}) },
      bio: { ...EMPTY_MANIFEST.bio, ...(data.bio || {}) },
    };
  } catch {
    // No manifest saved yet — that's expected before the first Save.
    return EMPTY_MANIFEST;
  }
}

// Overwrite the single manifest blob. Used by the admin Save route and by the
// Stripe webhook when it flips a purchased piece to "sold".
export async function writeManifest(manifest) {
  await put(MANIFEST_PATH, JSON.stringify(manifest), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}
