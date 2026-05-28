// Landing Page — Direction 2: Athletic Energy
// Dark always, bold display type, gym-poster vibe. Big numbers as proof.

const { useState: useStateL2 } = React;

function L2_Nav({ onLogin }) {
  return (
    <header className="l2-nav">
      <div className="lpd-container l2-nav__inner">
        <a className="l2-brand">
          <span className="l2-brand__mark"><window.MIcons.Lightning size={15} /></span>
          FitSplit
        </a>
        <nav className="l2-nav__links">
          <a href="#l2-product">Product</a>
          <a href="#l2-how">How it works</a>
          <a href="#l2-pricing">Pricing</a>
          <a href="#l2-customers">Customers</a>
        </nav>
        <div className="l2-nav__cta">
          <button className="l2-btn l2-btn--ghost" onClick={onLogin}>Log in</button>
          <button className="l2-btn l2-btn--brand">Start free trial</button>
        </div>
      </div>
    </header>
  );
}

function L2_Hero({ d, onLogin }) {
  return (
    <section className="l2-hero">
      <div className="l2-hero__grain" />
      <div className="l2-hero__glow" />
      <div className="lpd-container l2-hero__inner">
        <div className="l2-eyebrow">
          <span className="l2-eyebrow__dot" />
          {d.hero.eyebrow}
        </div>
        <h1 className="l2-h1">
          STRUCTURED <span className="l2-h1__alt">/</span> WORKOUTS.
          <br />
          DELIVERED <span className="l2-h1__brand">EVERY</span> REP.
        </h1>
        <p className="l2-hero__sub">{d.hero.sub}</p>
        <div className="l2-hero__cta">
          <button className="l2-btn l2-btn--brand l2-btn--lg" onClick={onLogin}>
            START FREE TRIAL <window.MIcons.ChevR size={14} />
          </button>
          <button className="l2-btn l2-btn--ghost l2-btn--lg">
            <window.MIcons.PlayOutline size={13} /> Watch demo
          </button>
        </div>

        <div className="l2-hero__strip">
          {d.proof.map((p) => (
            <div key={p.label} className="l2-stat">
              <strong>{p.value}</strong>
              <span>{p.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function L2_Showcase({ d }) {
  return (
    <section className="l2-section" id="l2-product">
      <div className="lpd-container">
        <div className="l2-section-head">
          <span className="l2-label">THE PRODUCT</span>
          <h2 className="l2-h2">Built for the floor. Used by every role.</h2>
        </div>

        <div className="l2-showcase">
          <div className="l2-showcase__nav">
            <span className="l2-showcase__nav-item l2-showcase__nav-item--on">
              <window.MIcons.Home size={14} /> Owner dashboard
            </span>
            <span className="l2-showcase__nav-item">
              <window.MIcons.Dumbbell size={14} /> Trainer console
            </span>
            <span className="l2-showcase__nav-item">
              <window.MIcons.User size={14} /> Member app
            </span>
          </div>
          <div className="l2-showcase__screen">
            <div className="l2-showcase__chrome">
              <span /><span /><span />
              <div className="l2-showcase__url">fitsplit.app/owner</div>
            </div>
            <div className="l2-showcase__body">
              <div className="l2-showcase__kpis">
                {[
                  { l: "Renewals due", v: "18", tone: "danger" },
                  { l: "Plans pending", v: "23", tone: "accent" },
                  { l: "Payments", v: "7", tone: "warn" },
                  { l: "In gym now", v: "14", tone: "brand" }
                ].map((k) => (
                  <div key={k.l} className={`l2-showcase__kpi l2-showcase__kpi--${k.tone}`}>
                    <small>{k.l}</small>
                    <strong>{k.v}</strong>
                  </div>
                ))}
              </div>
              <div className="l2-showcase__queue">
                <div className="l2-showcase__queue-head">
                  <span className="l2-showcase__pulse" />
                  PRIORITY QUEUE · 4 ITEMS
                </div>
                {[
                  { who: "Rohan Mehta", what: "Annual Pro · lapsed 4 days ago", tag: "EXPIRED", tone: "danger" },
                  { who: "Ananya Bose", what: "Half-year PT · ₹18,500 · cash", tag: "PAYMENT", tone: "warn" },
                  { who: "Devansh Joshi", what: "Quarterly · expires in 5 days", tag: "EXPIRING", tone: "warning" },
                  { who: "Pari Saxena", what: "Joined 11 days ago", tag: "NO PLAN", tone: "accent" }
                ].map((it) => (
                  <div key={it.who} className={`l2-showcase__row l2-showcase__row--${it.tone}`}>
                    <span className={`l2-showcase__tag l2-showcase__tag--${it.tone}`}>{it.tag}</span>
                    <div>
                      <strong>{it.who}</strong>
                      <small>{it.what}</small>
                    </div>
                    <button>Resolve</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function L2_Features({ features }) {
  const iconMap = {
    dumbbell: <window.MIcons.Dumbbell size={20} />,
    calendar: <window.MIcons.Calendar size={20} />,
    chart: <window.MIcons.Chart size={20} />,
    users: <window.MIcons.User size={20} />
  };
  return (
    <section className="l2-section l2-features">
      <div className="lpd-container">
        <div className="l2-feat-grid">
          {features.map((f) => (
            <article key={f.title} className="l2-feat">
              <div className="l2-feat__icon">{iconMap[f.icon]}</div>
              <h3>{f.title}</h3>
              <p>{f.body}</p>
              <span className="l2-feat__tag">{f.tag}</span>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function L2_How({ steps }) {
  return (
    <section className="l2-section" id="l2-how">
      <div className="lpd-container">
        <div className="l2-section-head">
          <span className="l2-label">WORKFLOW</span>
          <h2 className="l2-h2">Four moves. Zero friction.</h2>
        </div>
        <div className="l2-steps">
          {steps.map((s) => (
            <div key={s.n} className="l2-step">
              <span className="l2-step__num">{s.n}</span>
              <h3>{s.label}</h3>
              <p>{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function L2_Testimonial({ t, partners }) {
  return (
    <section className="l2-section l2-test" id="l2-customers">
      <div className="lpd-container">
        <div className="l2-test__card">
          <span className="l2-test__quote-mark">"</span>
          <blockquote>{t.quote}</blockquote>
          <div className="l2-test__attr">
            <span className="fm-avatar fm-avatar--md fs-avatar--c1">PN</span>
            <div>
              <strong>{t.author}</strong>
              <small>{t.role}</small>
            </div>
          </div>
        </div>
        <div className="l2-partners">
          <span className="l2-partners__label">TRUSTED BY</span>
          <div className="l2-partners__list">
            {partners.map((p) => (
              <span key={p} className="l2-partner">{p}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function L2_Pricing({ p }) {
  return (
    <section className="l2-section l2-pricing" id="l2-pricing">
      <div className="lpd-container">
        <div className="l2-section-head">
          <span className="l2-label">PRICING</span>
          <h2 className="l2-h2">{p.title}</h2>
          <p className="l2-section-sub">{p.sub}</p>
        </div>
        <div className="l2-plans">
          {p.plans.map((plan) => (
            <article key={plan.name} className={`l2-plan ${plan.featured ? "l2-plan--feat" : ""}`}>
              {plan.featured && <span className="l2-plan__pill">MOST POPULAR</span>}
              <h3>{plan.name}</h3>
              <div className="l2-plan__price">
                {plan.priceMonthly != null ? (
                  <><strong>₹{plan.priceMonthly}</strong><span>per member / month</span></>
                ) : (
                  <><strong>Custom</strong><span>{plan.priceUnit}</span></>
                )}
              </div>
              <span className="l2-plan__tag">{plan.tagline}</span>
              <ul>
                {plan.features.map((f) => (
                  <li key={f}><window.MIcons.Check size={13} /> {f}</li>
                ))}
              </ul>
              <button className={`l2-btn ${plan.featured ? "l2-btn--brand" : "l2-btn--ghost"} l2-btn--lg`} style={{ width: "100%" }}>
                {plan.priceMonthly != null ? "Start trial" : "Contact us"}
              </button>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function L2_CTA({ onLogin }) {
  return (
    <section className="l2-final-cta">
      <div className="lpd-container">
        <div className="l2-final-cta__inner">
          <h2 className="l2-h2">Run your gym like a coach, not an admin.</h2>
          <p>14-day free trial · no card required · live in under a week</p>
          <div className="l2-final-cta__btns">
            <button className="l2-btn l2-btn--brand l2-btn--lg" onClick={onLogin}>
              START FREE TRIAL <window.MIcons.ChevR size={14} />
            </button>
            <button className="l2-btn l2-btn--ghost l2-btn--lg">Book a demo</button>
          </div>
        </div>
      </div>
    </section>
  );
}

function L2_Footer() {
  return (
    <footer className="l2-footer">
      <div className="lpd-container">
        <div className="l2-footer__grid">
          <div>
            <a className="l2-brand"><span className="l2-brand__mark"><window.MIcons.Lightning size={15} /></span> FitSplit</a>
            <p>Workout delivery for modern gyms. Built in India · for everyone serious about strength.</p>
          </div>
          {[
            { h: "PRODUCT", items: ["Owner dashboard", "Trainer console", "Member app", "Pricing"] },
            { h: "COMPANY", items: ["About", "Customers", "Blog", "Careers"] },
            { h: "SUPPORT", items: ["Help center", "Contact", "Status", "Privacy"] }
          ].map((c) => (
            <div key={c.h}>
              <h4>{c.h}</h4>
              <ul>{c.items.map((i) => <li key={i}><a>{i}</a></li>)}</ul>
            </div>
          ))}
        </div>
        <div className="l2-footer__bar">
          <span>© 2026 FitSplit · fitsplit.in</span>
          <span>FOR GYMS THAT DELIVER COACHING — NOT JUST ACCESS</span>
        </div>
      </div>
    </footer>
  );
}

function LandingTwo() {
  const d = window.LANDING_MOCK;
  const [loginOpen, setLoginOpen] = useStateL2(false);
  return (
    <div className="lpd l2" data-theme-force="dark">
      <L2_Nav onLogin={() => setLoginOpen(true)} />
      <L2_Hero d={d} onLogin={() => setLoginOpen(true)} />
      <L2_Showcase d={d} />
      <L2_Features features={d.features} />
      <L2_How steps={d.steps} />
      <L2_Testimonial t={d.testimonial} partners={d.partners} />
      <L2_Pricing p={d.pricing} />
      <L2_CTA onLogin={() => setLoginOpen(true)} />
      <L2_Footer />
    </div>
  );
}

window.LandingTwo = LandingTwo;
