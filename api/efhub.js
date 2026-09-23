export default async function handler(req, res) {
  const source = 'https://efhub.com/es/tier-list/116014046796435242846_f1163d0a-6eed-4b91-92f3-2b925fe7eee7';
  try {
    const r = await fetch(source, {
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36',
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'accept-language': 'es-ES,es;q=0.9,en;q=0.7'
      },
      cache: 'no-store'
    });
    const body = await r.text();
    res.setHeader('Cache-Control','no-store, max-age=0');
    res.setHeader('Content-Type','text/plain; charset=utf-8');
    res.status(r.ok ? 200 : r.status).send(body);
  } catch (e) {
    res.status(502).json({error: String(e && e.message || e)});
  }
}
