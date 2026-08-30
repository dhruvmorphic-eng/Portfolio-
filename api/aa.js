// Proxies Artificial Analysis so the API key never reaches the browser.
// Key lives in the ARTIFICIAL_ANALYSIS_API_KEY env var on Vercel.
const UPSTREAM = 'https://artificialanalysis.ai/api/v2/data/llms/models';

const base = (n) => n.replace(/\s*\([^)]*\)\s*$/, '').trim();

export default async function handler(req, res) {
  // cache hard: this data moves slowly and the upstream payload is ~540KB
  res.setHeader('Cache-Control', 'public, s-maxage=21600, stale-while-revalidate=86400');

  const key = process.env.ARTIFICIAL_ANALYSIS_API_KEY;
  if (!key) return res.status(200).json({ ok: false, reason: 'no_key' });

  try {
    const r = await fetch(UPSTREAM, { headers: { 'x-api-key': key } });
    if (!r.ok) return res.status(200).json({ ok: false, reason: 'upstream_' + r.status });
    const json = await r.json();
    const models = json.data || [];

    const rows = [];
    for (const m of models) {
      const e = m.evaluations || {}, p = m.pricing || {};
      const iq = e.artificial_analysis_intelligence_index;
      if (iq == null) continue;
      rows.push({
        name: m.name,
        base: base(m.name),
        creator: (m.model_creator || {}).name || '—',
        date: m.release_date,
        iq: Math.round(iq * 10) / 10,
        code: e.artificial_analysis_coding_index != null ? Math.round(e.artificial_analysis_coding_index * 10) / 10 : null,
        price: p.price_1m_blended_3_to_1 != null ? p.price_1m_blended_3_to_1 : null,
        tps: m.median_output_tokens_per_second ? Math.round(m.median_output_tokens_per_second * 10) / 10 : null,
        ttft: m.median_time_to_first_token_seconds ? Math.round(m.median_time_to_first_token_seconds * 100) / 100 : null
      });
    }

    // collapse reasoning-effort variants to the best-scoring one per model
    const bestOf = new Map();
    for (const r of rows) {
      const k = r.creator + '|' + r.base;
      const cur = bestOf.get(k);
      if (!cur || r.iq > cur.iq) bestOf.set(k, r);
    }
    const uniq = [...bestOf.values()].sort((a, b) => b.iq - a.iq);
    const priced = uniq.filter(r => r.price != null);
    const withSpeed = uniq.filter(r => r.tps != null);

    const perCreator = new Map();
    for (const r of uniq) {
      const cur = perCreator.get(r.creator);
      if (!cur || r.iq > cur.iq) perCreator.set(r.creator, r);
    }

    const dates = uniq.map(r => r.date).filter(Boolean).sort();
    const prices = priced.map(r => r.price).sort((a, b) => a - b);

    return res.status(200).json({
      ok: true,
      generated: new Date().toISOString(),
      stats: {
        total_variants: rows.length,
        total_models: uniq.length,
        creators: perCreator.size,
        newest: dates[dates.length - 1],
        oldest: dates[0],
        top_iq: uniq.length ? uniq[0].iq : null,
        median_price: prices.length ? Math.round(prices[Math.floor(prices.length / 2)] * 100) / 100 : null
      },
      top: uniq.slice(0, 15),
      labs: [...perCreator.values()].sort((a, b) => b.iq - a.iq).slice(0, 12),
      value: priced.filter(r => r.iq >= 50 && r.price > 0).sort((a, b) => a.price - b.price).slice(0, 12),
      scatter: priced.filter(r => r.price > 0).slice(0, 260).map(r => ({ n: r.base, c: r.creator, iq: r.iq, p: r.price })),
      speed: withSpeed.sort((a, b) => b.tps - a.tps).slice(0, 12)
    });
  } catch (err) {
    return res.status(200).json({ ok: false, reason: 'fetch_failed' });
  }
}
