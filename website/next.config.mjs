import nextra from 'nextra'

const withNextra = nextra({
  // Content directory where MDX files live
})

export default withNextra({
  // Served from the root of https://cyclemetry.walkersutton.com/
  trailingSlash: true,
  // The stats script, served from this domain so ad blockers don't drop it.
  // Events take the same route through app/api/e.
  async rewrites() {
    return [{ source: '/api/s.js', destination: 'https://stats.walkersutton.com/stats.js' }]
  },
})
