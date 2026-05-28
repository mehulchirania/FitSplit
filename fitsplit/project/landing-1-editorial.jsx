// Landing Page — Direction 1: Calm Editorial
// Light, premium SaaS. Restrained type, breathing room, product floats in.

const { useState: useStateL1, useEffect: useEffectL1 } = React;

function L1_Nav({ onLogin }) {
  return (
    <header className="lpd-nav">
      <div className="lpd-container lpd-nav__inner">
        <a href="#top" className="lpd-brand">
          <span className="lpd-brand__mark"><window.MIcons.Lightning size={15} /></span>
          FitSplit
        </a>
        <nav className="lpd-nav__links">
          <a href="#product">Product</a>
          <a href="#how">How it works</a>
          <a href="#pricing">Pricing</a>
          <a href="#customers">Customers</a>
        </nav>
        <div className="lpd-nav__cta">
          <button className="lpd-btn lpd-btn--ghost" onClick={onLogin}>Log in</button>
          <button className="lpd-btn lpd-btn--primary">Start free trial</button>
        </div>
      </div>
    </header>
  );
}

function L1_Hero({ d, onLogin }) {
  return (
    <section className="l1-hero" id="top">
      <div className="lpd-container l1-hero__inner">
        <div className="l1-hero__copy">
          <span className="lpd-eyebrow">
            <span className="lpd-pulse" />
            {d.hero.eyebrow}
          </span>
          <h1 className="l1-h1">
            {d.hero.h1}
            <br />
            <span className="l1-h1__accent">{d.hero.h1Accent}</span>
          </h1>
          <p className="l1-hero__sub">{d.hero.sub}</p>
          <div className="l1-hero__cta">
            <button className="lpd-btn lpd-btn--primary lpd-btn--lg" onClick={onLogin}>
              {d.hero.ctaPrimary} <window.MIcons.ChevR size={14} />
            </button>
            <button className="lpd-btn lpd-btn--ghost lpd-btn--lg">
              <window.MIcons.Play size={13} /> {d.hero.ctaSecondary}
            </button>
          </div>
          <div className="l1-hero__trust">
            <div className="l1-hero__trust-avatars">
              {["AS", "RM", "IK", "MN"].map((i, k) => (
                <span key={k} className={`fm-avatar fm-avatar--sm fs-avatar--c${(k % 6) + 1}`}>{i}</span>
              ))}
            </div>
            <span><strong>248 gyms</strong> · trusted across India</span>
          </div>
        </div>

        <div className="l1-hero__visual">
          <L1_MockOwner />
          <div className="l1-hero__phone">
            <L1_MockPhone />
          </div>
        </div>
      </div>
    </section>
  );
}

function L1_MockOwner() {
  return (
    <div className="l1-mock l1-mock--owner">
      <div className="l1-mock__chrome">
        <span /><span /><span />
        <div className="l1-mock__url">fitsplit.app · Owner dashboard</div>
      </div>
      <div className="l1-mock__body">
        <div className="l1-mock__row">
          <strong>Good morning, Priya</strong>
          <span>3 things need your attention</span>
        </div>
        <div className="l1-mock__kpis">
          <div className="l1-mock__kpi l1-mock__kpi--danger">
            <small>Renewals due</small>
            <strong>18</strong>
          </div>
          <div className="l1-mock__kpi l1-mock__kpi--accent">
            <small>Plans pending</small>
            <strong>23</strong>
          </div>
          <div className="l1-mock__kpi l1-mock__kpi--warn">
            <small>Payments</small>
            <strong>7</strong>
          </div>
        </div>
        <div className="l1-mock__list">
          <div className="l1-mock__action l1-mock__action--danger">
            <span className="l1-mock__action-tag">EXPIRED</span>
            <div>
              <strong>Rohan Mehta</strong>
              <small>Annual Pro · lapsed 4 days ago</small>
            </div>
            <button>Renew</button>
          </div>
          <div className="l1-mock__action l1-mock__action--warn">
            <span className="l1-mock__action-tag">PAYMENT</span>
            <div>
              <strong>Ananya Bose</strong>
              <small>Half-year PT · ₹18,500</small>
            </div>
            <button>Approve</button>
          </div>
          <div className="l1-mock__action l1-mock__action--accent">
            <span className="l1-mock__action-tag">NO PLAN</span>
            <div>
              <strong>Pari Saxena</strong>
              <small>Joined 11 days ago</small>
            </div>
            <button>Assign</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function L1_MockPhone() {
  return (
    <div className="l1-phone">
      <div className="l1-phone__notch" />
      <div className="l1-phone__body">
        <div className="l1-phone__head">
          <small>Today's session</small>
          <strong>Day B · Push</strong>
          <span>Week 4 · 6 lifts · ~55m</span>
        </div>
        <div className="l1-phone__ex">
          <span className="l1-phone__check l1-phone__check--on">✓</span>
          <div>
            <strong>Bench Press</strong>
            <small>4 × 5–8 · 52.5kg</small>
          </div>
        </div>
        <div className="l1-phone__ex">
          <span className="l1-phone__check l1-phone__check--on">✓</span>
          <div>
            <strong>Incline DB Press</strong>
            <small>3 × 8–10 · 18kg</small>
          </div>
        </div>
        <div className="l1-phone__ex l1-phone__ex--active">
          <span className="l1-phone__check" />
          <div>
            <strong>Overhead Press</strong>
            <small>3 × 6–8 · ↑ try 27.5kg</small>
          </div>
        </div>
      </div>
    </div>
  );
}

function L1_Proof({ proof }) {
  return (
    <section className="l1-proof">
      <div className="lpd-container">
        <div className="l1-proof__grid">
          {proof.map((p) => (
            <div key={p.label} className="l1-proof__item">
              <strong>{p.value}</strong>
              <span>{p.label}</span>
              <small>{p.small}</small>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function L1_Features({ features }) {
  const iconMap = {
    dumbbell: <window.MIcons.Dumbbell size={20} />,
    calendar: <window.MIcons.Calendar size={20} />,
    chart: <window.MIcons.Chart size={20} />,
    users: <window.MIcons.User size={20} />
  };
  return (
    <section className="lpd-section" id="product">
      <div className="lpd-container">
        <div className="lpd-section-head">
          <span className="lpd-section-label">The product</span>
          <h2 className="lpd-h2">Built around how training floors actually work.</h2>
          <p className="lpd-sub">Less clutter. Clearer coaching. Plans, members, progress — one focused workspace for every role.</p>
        </div>
        <div className="l1-feat-grid">
          {features.map((f) => (
            <article key={f.title} className="l1-feat">
              <div className="l1-feat__icon">{iconMap[f.icon]}</div>
              <div className="l1-feat__tag">{f.tag}</div>
              <h3 className="l1-feat__title">{f.title}</h3>
              <p className="l1-feat__body">{f.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function L1_HowItWorks({ steps }) {
  return (
    <section className="lpd-section l1-how" id="how">
      <div className="lpd-container">
        <div className="lpd-section-head">
          <span className="lpd-section-label">How it works</span>
          <h2 className="lpd-h2">From program to progress in four moves.</h2>
        </div>
        <div className="l1-steps">
          {steps.map((s, i) => (
            <div key={s.n} className="l1-step">
              <span className="l1-step__num">{s.n}</span>
              <h3 className="l1-step__label">{s.label}</h3>
              <p className="l1-step__body">{s.body}</p>
              {i < steps.length - 1 && <div className="l1-step__line" />}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function L1_Testimonial({ t, partners }) {
  return (
    <section className="lpd-section l1-test" id="customers">
      <div className="lpd-container">
        <div className="l1-test__card">
          <blockquote className="l1-test__quote">
            <span className="l1-test__quote-mark">"</span>
            {t.quote}
          </blockquote>
          <div className="l1-test__attr">
            <span className="fm-avatar fm-avatar--md fs-avatar--c1">PN</span>
            <div>
              <strong>{t.author}</strong>
              <small>{t.role}</small>
            </div>
          </div>
        </div>
        <div className="l1-partners">
          {partners.map((p) => (
            <span key={p} className="l1-partner">{p}</span>
          ))}
        </div>
      </div>
    </section>
  );
}

function L1_Pricing({ p }) {
  return (
    <section className="lpd-section l1-pricing" id="pricing">
      <div className="lpd-container">
        <div className="lpd-section-head">
          <span className="lpd-section-label">Pricing</span>
          <h2 className="lpd-h2">{p.title}</h2>
          <p className="lpd-sub">{p.sub}</p>
        </div>
        <div className="l1-plans">
          {p.plans.map((plan) => (
            <article key={plan.name} className={`l1-plan ${plan.featured ? "l1-plan--feat" : ""}`}>
              {plan.featured && <span className="l1-plan__pill">Most popular</span>}
              <h3 className="l1-plan__name">{plan.name}</h3>
              <div className="l1-plan__price">
                {plan.priceMonthly != null ? (
                  <>
                    <strong>₹{plan.priceMonthly}</strong>
                    <span>per member / mo</span>
                  </>
                ) : (
                  <>
                    <strong>Talk to us</strong>
                    <span>{plan.priceUnit}</span>
                  </>
                )}
              </div>
              <div className="l1-plan__tagline">{plan.tagline}</div>
              <ul className="l1-plan__features">
                {plan.features.map((f) => (
                  <li key={f}><window.MIcons.Check size={13} /> {f}</li>
                ))}
              </ul>
              <button className={`lpd-btn ${plan.featured ? "lpd-btn--brand" : "lpd-btn--ghost"} lpd-btn--lg`} style={{ width: "100%" }}>
                {plan.priceMonthly != null ? "Start trial" : "Talk to sales"}
              </button>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function L1_FAQ({ faq }) {
  const [open, setOpen] = useStateL1(0);
  return (
    <section className="lpd-section l1-faq">
      <div className="lpd-container">
        <div className="lpd-section-head lpd-section-head--left">
          <span className="lpd-section-label">FAQ</span>
          <h2 className="lpd-h2">Common questions</h2>
        </div>
        <div className="l1-faq__list">
          {faq.map((f, i) => (
            <details key={i} className="l1-faq__item" open={open === i} onClick={(e) => { e.preventDefault(); setOpen(open === i ? -1 : i); }}>
              <summary>
                <span>{f.q}</span>
                <window.MIcons.Plus size={16} />
              </summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function L1_CTA({ onLogin }) {
  return (
    <section className="l1-cta">
      <div className="lpd-container">
        <div className="l1-cta__card">
          <div>
            <h2 className="lpd-h2" style={{ marginBottom: 8 }}>Try FitSplit with your gym.</h2>
            <p className="lpd-sub">14 days free, no card required. Add as many members as you want during trial.</p>
          </div>
          <div className="l1-cta__btns">
            <button className="lpd-btn lpd-btn--brand lpd-btn--lg" onClick={onLogin}>
              Start free trial <window.MIcons.ChevR size={14} />
            </button>
            <button className="lpd-btn lpd-btn--ghost lpd-btn--lg">Book a demo</button>
          </div>
        </div>
      </div>
    </section>
  );
}

function L1_Footer() {
  return (
    <footer className="lpd-foot">
      <div className="lpd-container">
        <div className="lpd-foot__grid">
          <div>
            <a className="lpd-brand">
              <span className="lpd-brand__mark"><window.MIcons.Lightning size={15} /></span>
              FitSplit
            </a>
            <p className="lpd-foot__brand-blurb">Workout delivery, trainer coordination, member progress — one focused workspace for modern gyms.</p>
          </div>
          <div className="lpd-foot__col">
            <h4>Product</h4>
            <ul>
              <li><a>Owner dashboard</a></li>
              <li><a>Trainer console</a></li>
              <li><a>Member app</a></li>
              <li><a>Pricing</a></li>
            </ul>
          </div>
          <div className="lpd-foot__col">
            <h4>Company</h4>
            <ul>
              <li><a>About</a></li>
              <li><a>Customers</a></li>
              <li><a>Blog</a></li>
              <li><a>Careers</a></li>
            </ul>
          </div>
          <div className="lpd-foot__col">
            <h4>Support</h4>
            <ul>
              <li><a>Help center</a></li>
              <li><a>Contact</a></li>
              <li><a>Status</a></li>
              <li><a>Privacy</a></li>
            </ul>
          </div>
        </div>
        <div className="lpd-foot__bar">
          <span>© 2026 FitSplit · fitsplit.in</span>
          <span>Built for gyms that deliver coaching, not just access.</span>
        </div>
      </div>
    </footer>
  );
}

function L1_LoginModal({ open, onClose }) {
  const [mode, setMode] = useStateL1("member");
  if (!open) return null;
  return (
    <div className="l1-modal-backdrop" onClick={onClose}>
      <div className="l1-modal" onClick={(e) => e.stopPropagation()}>
        <div className="l1-modal__head">
          <a className="lpd-brand">
            <span className="lpd-brand__mark"><window.MIcons.Lightning size={15} /></span>
            FitSplit
          </a>
          <button className="l1-modal__x" onClick={onClose} aria-label="Close">
            <window.MIcons.X size={16} />
          </button>
        </div>
        <h3>Access your workspace</h3>
        <p className="l1-modal__sub">Members use mobile + PIN. Staff use username + password.</p>
        <div className="l1-modal__tabs">
          {["member", "staff"].map((t) => (
            <button
              key={t}
              className={`l1-modal__tab ${mode === t ? "l1-modal__tab--on" : ""}`}
              onClick={() => setMode(t)}
            >
              {t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        <form className="l1-modal__form" onSubmit={(e) => { e.preventDefault(); onClose(); }}>
          <label>
            <span>{mode === "member" ? "Mobile or username" : "Username"}</span>
            <input type="text" autoFocus />
          </label>
          <label>
            <span>{mode === "member" ? "4-digit PIN" : "Password"}</span>
            <input type="password" />
          </label>
          <button className="lpd-btn lpd-btn--primary lpd-btn--lg" style={{ width: "100%" }}>Log in</button>
          <a className="l1-modal__forgot">Forgot password?</a>
        </form>
      </div>
    </div>
  );
}

function LandingOne() {
  const d = window.LANDING_MOCK;
  const [loginOpen, setLoginOpen] = useStateL1(false);
  return (
    <div className="lpd l1">
      <L1_Nav onLogin={() => setLoginOpen(true)} />
      <L1_Hero d={d} onLogin={() => setLoginOpen(true)} />
      <L1_Proof proof={d.proof} />
      <L1_Features features={d.features} />
      <L1_HowItWorks steps={d.steps} />
      <L1_Testimonial t={d.testimonial} partners={d.partners} />
      <L1_Pricing p={d.pricing} />
      <L1_FAQ faq={d.faq} />
      <L1_CTA onLogin={() => setLoginOpen(true)} />
      <L1_Footer />
      <L1_LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  );
}

window.LandingOne = LandingOne;
