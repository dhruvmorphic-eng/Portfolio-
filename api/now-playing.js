export default async function handler(req, res) {
  if (req.query.debug === '1') {
    return res.status(200).json({
      idLen: (process.env.SPOTIFY_CLIENT_ID || '').length,
      secretLen: (process.env.SPOTIFY_CLIENT_SECRET || '').length,
      tokenLen: (process.env.SPOTIFY_REFRESH_TOKEN || '').length,
    });
  }
  const client_id = process.env.SPOTIFY_CLIENT_ID;
  const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
  const refresh_token = process.env.SPOTIFY_REFRESH_TOKEN;
  res.setHeader('Cache-Control', 'public, s-maxage=20, stale-while-revalidate=20');

  if (!refresh_token) return res.status(200).json({ isPlaying: false });

  const basic = Buffer.from(`${client_id}:${client_secret}`).toString('base64');
  const tokenResp = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Authorization': `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token }),
  });
  const tokenData = await tokenResp.json();
  const access_token = tokenData.access_token;
  if (!access_token) return res.status(200).json({ isPlaying: false });

  const fmt = (item, playing) => ({
    isPlaying: playing,
    title: item.name,
    artist: item.artists.map(a => a.name).join(', '),
    album: item.album.name,
    albumArt: item.album.images?.[0]?.url || '',
    url: item.external_urls?.spotify || '',
  });

  const now = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
    headers: { 'Authorization': `Bearer ${access_token}` },
  });
  if (now.status === 200) {
    const song = await now.json();
    if (song && song.item) return res.status(200).json(fmt(song.item, song.is_playing));
  }

  const recent = await fetch('https://api.spotify.com/v1/me/player/recently-played?limit=1', {
    headers: { 'Authorization': `Bearer ${access_token}` },
  });
  if (recent.status === 200) {
    const data = await recent.json();
    const track = data.items?.[0]?.track;
    if (track) return res.status(200).json(fmt(track, false));
  }
  return res.status(200).json({ isPlaying: false });
}
