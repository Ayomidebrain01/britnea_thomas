// Vercel serverless function — proxies GitHub API
// Token lives only in Vercel environment variables, never in client code

const GITHUB_USER = 'Ayomidebrain01';
const GITHUB_REPO = 'britnea_thomas';
const JSON_PATH   = 'properties.json';
const GITHUB_API  = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${JSON_PATH}`;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS'
};

export default async function handler(req, res) {
  // Set CORS headers on every response
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method === 'OPTIONS') return res.status(200).end();

  const token = process.env.GITHUB_TOKEN;
  if (!token) return res.status(500).json({ error: 'GITHUB_TOKEN not set' });

  const ghHeaders = {
    Authorization: `token ${token}`,
    Accept: 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
    'User-Agent': 'britnae-admin'
  };

  try {
    if (req.method === 'GET') {
      const response = await fetch(GITHUB_API, { headers: ghHeaders });
      const data = await response.json();

      // Admin panel needs SHA — pass ?admin=1
      if (req.query.admin === '1') {
        return res.status(response.status).json(data);
      }

      // Public pages — return plain array
      const props = JSON.parse(Buffer.from(data.content, 'base64').toString('utf8'));
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json(props);
    }

    if (req.method === 'PUT') {
      const response = await fetch(GITHUB_API, {
        method: 'PUT',
        headers: ghHeaders,
        body: JSON.stringify(req.body)
      });
      const data = await response.json();
      return res.status(response.status).json(data);
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
