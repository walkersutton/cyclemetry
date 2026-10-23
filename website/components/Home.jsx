import videos from "../content/videos/videos.json";
import { VideoGrid } from "./Videos.jsx";

const FEATURED_VIDEO_COUNT = 6;

const arrow = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="17"
    height="17"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </svg>
);

// Mirrors the app's Quick Start panel, which is what demo.gif walks through.
const steps = [
  {
    title: "Choose a template",
    desc: "Start from a ready-made layout, then move, resize, and restyle anything.",
  },
  {
    title: "Load your activity",
    desc: "Open a GPX file from disk, or pull a ride straight from Strava.",
  },
  {
    title: "Render",
    desc: "Add your footage and export a video with the overlay synced to every frame.",
  },
];

export function Home() {
  return (
    <div className="showcase-page showcase-page-wide home">
      <div className="showcase-hero">
        <div className="showcase-hero-kicker">Cycling telemetry overlays</div>
        <h1 className="showcase-hero-title">Your ride, with the numbers.</h1>
        <p className="showcase-hero-desc">
          Cyclemetry turns your GPX data into overlays synced frame by frame
          with your footage — speed, power, heart rate, cadence, gradient, and a
          live route map.
        </p>
        <div className="showcase-submit-actions home-hero-actions">
          <a className="showcase-button showcase-button-primary" href="/install/">
            Download free
            {arrow}
          </a>
          <a className="showcase-button" href="#community">
            Watch rider videos
          </a>
        </div>
      </div>

      <section className="home-section" id="how-it-works">
        <div className="showcase-hero-kicker">How it works</div>
        <h2 className="home-section-title">GPX in, overlay out.</h2>
        <div className="home-demo">
          <img
            className="home-demo-gif"
            src="/demo.gif"
            alt="Cyclemetry demo: choosing a template, loading an activity, and rendering an overlay"
            width="1293"
            height="733"
            loading="lazy"
          />
          <ol className="showcase-steps home-steps">
            {steps.map((step) => (
              <li key={step.title}>
                <div>
                  <strong>{step.title}</strong>
                  <p>{step.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="home-section" id="community">
        <div className="home-section-head">
          <div>
            <div className="showcase-hero-kicker">Made with Cyclemetry</div>
            <h2 className="home-section-title">Rides from the community</h2>
          </div>
          <a className="home-section-link" href="/videos/">
            All {videos.length} videos
            {arrow}
          </a>
        </div>
        <VideoGrid limit={FEATURED_VIDEO_COUNT} />
        <div className="showcase-callout">
          <div className="showcase-callout-text">
            <strong>Made something with Cyclemetry?</strong>{" "}
            <a href="/videos/submit/">Submit your video</a>
            {" and we'll feature it here."}
          </div>
        </div>
      </section>

      <div className="showcase-submit-panel">
        <div>
          <h2>Make your first overlay</h2>
          <p>Free and open source for macOS, Windows, and Linux.</p>
        </div>
        <div className="showcase-submit-actions">
          <a className="showcase-button showcase-button-primary" href="/install/">
            Download
            {arrow}
          </a>
          <a className="showcase-button" href="/comparison/">
            Compare tools
          </a>
        </div>
      </div>
    </div>
  );
}
