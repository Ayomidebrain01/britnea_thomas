// Netlify serverless function — proxies GitHub API
// Token lives only in Netlify environment variables, never in client code

const GITHUB_USER  = 'Ayomidebrain01';
const GITHUB_REPO  = 'britnea_thomas';
const JSON_PATH    = 'properties.json';
const GITHUB_API   = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${JSON_PATH}`;

exports.handler = async (event) => {
  const token = process.env.GITHUB_TOKEN;

  if (!token) {
    return { statusCode: 500, body: JSON.stringify({ error: 'GITHUB_TOKEN not set in Netlify environment variables' }) };
  }

  const headers = {
    Authorization: `token ${token}`,
    Accept: 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
    'User-Agent': 'britnae-admin'
  };

  // CORS headers so admin.html can call this function
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: cors, body: '' };
  }

  try {
    if (event.httpMethod === 'GET') {
      // Read properties.json from GitHub
      const res = await fetch(GITHUB_API, { headers });
      const data = await res.json();
      return {
        statusCode: res.status,
        headers: { ...cors, 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      };
    }

    if (event.httpMethod === 'PUT') {
      // Write properties.json to GitHub
      const body = JSON.parse(event.body);
      const res = await fetch(GITHUB_API, {
        method: 'PUT',
        headers,
        body: JSON.stringify(body)
      });
      const data = await res.json();
      return {
        statusCode: res.status,
        headers: { ...cors, 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      };
    }

    return { statusCode: 405, headers: cors, body: 'Method not allowed' };

  } catch (e) {
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: e.message }) };
  }
};
