// Vercel serverless function — proxies GitHub API
// Handles properties, enquiries and leads

const GITHUB_USER = 'Ayomidebrain01';
const GITHUB_REPO = 'britnea_thomas';
const BASE_API    = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents`;

const FILES = {
  properties: 'properties.json',
  enquiries:  'enquiries.json',
  leads:      'leads.json',
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS'
};

function setCORS(res) {
  Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));
}

async function getFile(filePath, ghHeaders) {
  const res = await fetch(`${BASE_API}/${filePath}`, { headers: ghHeaders });
  if (res.status === 404) return { data: [], sha: null };
  const json = await res.json();
  const data = JSON.parse(Buffer.from(json.content, 'base64').toString('utf8'));
  return { data, sha: json.sha };
}

async function saveFile(filePath, data, sha, message, ghHeaders) {
  const content = Buffer.from(JSON.stringify(data, null, 2)).toString('base64');
  const body = { message, content };
  if (sha) body.sha = sha;
  return fetch(`${BASE_API}/${filePath}`, {
    method: 'PUT',
    headers: ghHeaders,
    body: JSON.stringify(body)
  });
}

export default async function handler(req, res) {
  // Always set CORS headers first
  setCORS(res);

  // Handle preflight immediately — must return 200
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) return res.status(500).json({ error: 'GITHUB_TOKEN not set' });

  const ghHeaders = {
    Authorization: `token ${token}`,
    Accept: 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
    'User-Agent': 'britnae-admin'
  };

  // Determine which file from URL
  const url = req.url || '';
  let fileKey = 'properties';
  if (url.includes('enquiries')) fileKey = 'enquiries';
  else if (url.includes('leads')) fileKey = 'leads';
  const filePath = FILES[fileKey];

  try {
    // ── GET ──
    if (req.method === 'GET') {
      const ghRes = await fetch(`${BASE_API}/${filePath}`, { headers: ghHeaders });
      res.setHeader('Cache-Control', 'no-store');

      if (ghRes.status === 404) {
        return res.status(200).json([]);
      }

      const json = await ghRes.json();

      if (req.query?.admin === '1') {
        return res.status(200).json(json);
      }

      const data = JSON.parse(Buffer.from(json.content, 'base64').toString('utf8'));
      return res.status(200).json(data);
    }

    // ── POST — append new item (enquiries + leads) ──
    if (req.method === 'POST') {
      if (fileKey === 'properties') {
        return res.status(405).json({ error: 'Use PUT for properties' });
      }
      const { data: existing, sha } = await getFile(filePath, ghHeaders);
      const newItem = {
        ...req.body,
        id: Date.now(),
        date: new Date().toLocaleDateString('en-US')
      };
      const updated = [newItem, ...existing];
      const saveRes = await saveFile(filePath, updated, sha, `Add ${fileKey.slice(0, -1)}`, ghHeaders);
      if (saveRes.ok) {
        return res.status(200).json({ success: true });
      }
      const errData = await saveRes.json();
      return res.status(saveRes.status).json(errData);
    }

    // ── PUT — full replace ──
    if (req.method === 'PUT') {
      const ghRes = await fetch(`${BASE_API}/${filePath}`, {
        method: 'PUT',
        headers: ghHeaders,
        body: JSON.stringify(req.body)
      });
      const data = await ghRes.json();
      return res.status(ghRes.status).json(data);
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
