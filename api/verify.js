// Lets the admin page check a password before showing the dashboard,
// without exposing whether ADMIN_PASSWORD is set at all to the public.
import { isAuthorized } from './_auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (isAuthorized(req)) {
    res.status(200).json({ ok: true });
  } else {
    res.status(401).json({ ok: false });
  }
}
