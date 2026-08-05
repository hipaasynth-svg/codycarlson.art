// Shared helper for the admin API routes. The admin password is set as an
// environment variable (ADMIN_PASSWORD) in the Vercel project — it never
// lives in the codebase. Every write route (upload, save) requires it; the
// read route (gallery) is public since visitors need it to see photos.
export function isAuthorized(req) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false; // fail closed if not configured yet
  const provided = req.headers['x-admin-password'];
  return typeof provided === 'string' && provided === expected;
}
