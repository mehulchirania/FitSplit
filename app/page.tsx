import { FeatureCarousel } from "@/components/feature-carousel";
import { LoginForm } from "@/components/login-form";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <main className="intro-page">
      <section className="intro-hero">
        <div className="intro-hero-copy">
          <img alt="FitSplit" className="intro-hero-logo" src="/icon-512.png" />
          <p className="eyebrow">FitSplit</p>
          <h1>Your fitness companion</h1>
          <p>
            A modern gym management workspace where members follow assigned
            training, owners manage workout programs, and AI supports
            semi-personal coaching at scale.
          </p>
          <a className="button button-primary intro-hero-button" href="#features">
            Explore features
          </a>
        </div>
      </section>

      <section className="intro-section" id="features">
        <div className="intro-section-heading">
          <p className="eyebrow">What FitSplit handles</p>
          <h2>Training operations with a calmer interface.</h2>
        </div>
        <FeatureCarousel />
        <div className="intro-login-cta">
          <a className="button button-primary" href="#login">
            Login now
          </a>
        </div>
      </section>

      <section className="intro-login-band" id="login">
        <div className="intro-login-copy">
          <p className="eyebrow">Ready when you are</p>
          <h2>Login now</h2>
          <p>
            Use the demo credentials shown in the panel to enter as a member,
            owner, or admin while Firebase Auth setup is finalized.
          </p>
        </div>
        <LoginForm />
      </section>

    </main>
  );
}
