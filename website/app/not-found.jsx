import Link from 'next/link'
import TrackEvent from '../components/TrackEvent'

export const metadata = {
  title: 'Page Not Found',
}

export default function NotFound() {
  return (
    <main className="not-found-page">
      <TrackEvent name="404" />
      <div className="not-found-kicker">404</div>
      <h1>Page not found</h1>
      <p>
        This page does not exist or the link has moved. Start from the install guide, blog, or
        project overview.
      </p>
      <div className="not-found-actions">
        <Link href="/">Overview</Link>
        <Link href="/install">Install</Link>
        <Link href="/blog">Blog</Link>
      </div>
    </main>
  )
}
