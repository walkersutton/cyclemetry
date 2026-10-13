import { Layout, Navbar } from 'nextra-theme-docs'
import { Head } from 'nextra/components'
import { getPageMap } from 'nextra/page-map'
import Script from 'next/script'
import GitHubStarsLink from '../components/GitHubStarsLink'
import 'nextra-theme-docs/style.css'
import './globals.css'

export const metadata = {
  metadataBase: new URL('https://cyclemetry.walkersutton.com'),
  title: {
    template: '%s — Cyclemetry',
    default: 'Cyclemetry — Cycling Telemetry Video Overlays',
  },
  description:
    'Create stunning cycling telemetry video overlays from GPX data. Visualize speed, power, heart rate, elevation, cadence, and more.',
  keywords: [
    'cycling telemetry overlay',
    'GPX video overlay',
    'cycling video data overlay',
    'Garmin VIRB alternative',
    'GoPro telemetry extractor alternative',
    'bike data overlay software',
    'cycling YouTube overlay tool',
  ],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'Cyclemetry',
  },
}

const navbar = (
  <Navbar
    logo={
      <span className="cyclemetry-navbar-logo">
        <img src="/logo.png" alt="" width="24" height="24" className="cyclemetry-navbar-logo-mark" />
        Cyclemetry
      </span>
    }
  >
    <a className="cyclemetry-navbar-link" href="/install/">Install</a>
    <a className="cyclemetry-navbar-link" href="/blog/">Blog</a>
    <GitHubStarsLink />
  </Navbar>
)

export default async function RootLayout({ children }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <Head>
        <link rel="icon" type="image/png" sizes="512x512" href="/logo.png?v=2" />
        <link rel="icon" href="/favicon.ico?v=2" />
        <link rel="shortcut icon" href="/favicon.ico?v=2" />
      </Head>
      <body>
        {/* Pageviews go to stats.walkersutton.com by way of this domain
            (/api/s.js and /api/e) so ad blockers let them through. stats.js
            counts client-side navigations itself. */}
        <Script
          src="/api/s.js"
          data-site-id="cyclemetry.walkersutton.com"
          data-api="/api/e"
          strategy="afterInteractive"
        />
        <Layout
          navbar={navbar}
          pageMap={await getPageMap()}
          docsRepositoryBase="https://github.com/walkersutton/cyclemetry/blob/main/website"
          darkMode={false}
          nextThemes={{ defaultTheme: 'dark', forcedTheme: 'dark' }}
          sidebar={{ defaultMenuCollapseLevel: 1 }}
          editLink="Edit this page on GitHub"
        >
          {children}
        </Layout>
      </body>
    </html>
  )
}
