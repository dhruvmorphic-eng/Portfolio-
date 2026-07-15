export default async function handler(req, res) {
  const code = req.query.code;
  if (!code) return res.status(400).send('Missing authorization code.');

  const client_id = process.env.SPOTIFY_CLIENT_ID;
  const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
  const redirect_uri = 'https://dhruvpradeep.in/api/callback';
  const basic = Buffer.from(`${client_id}:${client_secret}`).toString('base64');

  const resp = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri }),
  });
  const data = await resp.json();

  res.setHeader('Content-Type', 'text/html');
  if (data.refresh_token) {
    return res.status(200).send(`<body style="background:#000;color:#fff;font-family:monospace;padding:3rem;line-height:1.7"><h2 style="color:#1DB954">Spotify connected.</h2><p>Copy the token below and paste it back to Claude:</p><textarea readonly style="width:100%;max-width:600px;height:90px;background:#111;color:#1DB954;border:1px solid #333;border-radius:8px;padding:1rem;font-family:monospace" onclick="this.select()">${data.refresh_token}</textarea><p style="color:#666">You can close this tab after copying.</p></body>`);
  }
  return res.status(400).send(`<body style="background:#000;color:#f55;font-family:monospace;padding:3rem"><h3>Error</h3><pre>${JSON.stringify(data, null, 2)}</pre></body>`);
}
