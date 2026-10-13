/**
 * First-party endpoint for pageview events, relayed to stats.walkersutton.com.
 * Ad blockers routinely drop requests to third-party analytics hosts; sent to
 * this domain, the events get through.
 *
 * A plain rewrite would not do: the stats server would see this deployment's
 * IP for every visitor, collapsing them into one and tripping its rate limit.
 * So the visitor's own IP and location are forwarded in x-stats-* headers,
 * which the stats server only believes alongside the shared secret.
 */
const UPSTREAM = 'https://stats.walkersutton.com/api/event'

export async function POST(request) {
  const secret = process.env.STATS_PROXY_SECRET
  // Without the secret the stats server can't trust who the visitor is, and
  // every event would count as the same person. Better to drop them.
  if (!secret) return new Response(null, { status: 503 })

  const body = await request.text()
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim()

  // stats.js sends a text/plain beacon, but SvelteKit refuses cross-site
  // text/plain POSTs as form submissions. The body is JSON either way.
  const headers = new Headers({
    'content-type': 'application/json',
    'x-stats-proxy-secret': secret,
  })
  // The stats server checks Origin against the site, and reads the user agent
  // for bot filtering and the visitor hash.
  for (const name of ['origin', 'referer', 'user-agent', 'x-purpose']) {
    const value = request.headers.get(name)
    if (value) headers.set(name, value)
  }
  if (ip) headers.set('x-stats-client-ip', ip)
  const country = request.headers.get('x-vercel-ip-country')
  const region = request.headers.get('x-vercel-ip-country-region')
  if (country) headers.set('x-stats-country', country)
  if (region) headers.set('x-stats-region', region)

  try {
    const upstream = await fetch(UPSTREAM, {
      method: 'POST',
      headers,
      body,
      signal: AbortSignal.timeout(5000),
    })
    return new Response(null, { status: upstream.status })
  } catch {
    return new Response(null, { status: 502 })
  }
}
