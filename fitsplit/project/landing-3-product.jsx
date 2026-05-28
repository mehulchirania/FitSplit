// Landing Page — Direction 3: Product-Forward
// Show, don't tell. Hero IS the product. Sections showcase specific moments.

const { useState: useStateL3 } = React;

function L3_Nav({ onLogin }) {
  return (
    <header className="lpd-nav l3-nav">
      <div className="lpd-container lpd-nav__inner">
        <a className="lpd-brand">
          <span className="lpd-brand__mark"><window.MIcons.Lightning size={15} /></span>
          FitSplit
        </a>
        <nav className="lpd-nav__links">
          <a href="#l3-owner">For owners</a>
          <a href="#l3-trainer">For trainers</a>
          <a href="#l3-member">For members</a>
          <a href="#l3-pricing">Pricing</a>
        </nav>
        <div className="lpd-nav__cta">
          <button className="lpd-btn lpd-btn--ghost" onClick={onLogin}>Log in</button>
          <button className="lpd-btn lpd-btn--brand">Start free trial</button>
        </div>
      </div>
    </header>
  );
}

function L3_Hero({ d, onLogin }) {
  return (
    <section className="l3-hero">
      <div className="lpd-container l3-hero__inner">
        <span className="lpd-eyebrow">
          <span className="lpd-pulse" />
          {d.hero.eyebrow}
        </span>
        <h1 className="l3-h1">
          The workspace built for
          <br />
          <span className="l3-h1__alt">how gyms actually run.</span>
        </h1>
        <p className="l3-hero__sub">
          One product for owners, trainers, and members. Real-time floor. Real-time progress.
          Real-time renewals.
        </p>
        <div className="l3-hero__cta">
          <button className="lpd-btn lpd-btn--primary lpd-btn--lg" onClick={onLogin}>
            Start free trial <window.MIcons.ChevR size={14} />
          </button>
          <button className="lpd-btn lpd-btn--ghost lpd-btn--lg">
            See live demo
          </button>
        </div>

        <div className="l3-hero__product">
          <L3_OwnerScreenshot />
          <div className="l3-hero__phone-mobile">
            <L3_MemberPhone />
          </div>
        </div>
      </div>
    </section>
  );
}

function L3_OwnerScreenshot() {
  return (
    <div className="l3-screen">
      <div className="l3-screen__chrome">
        <span /><span /><span />
        <div className="l3-screen__url">fitsplit.app/owner · Command Room</div>
      </div>
      <div className="l3-screen__app">
        <div className="l3-screen__side">
          <div className="l3-screen__brand">
            <span className="l3-screen__brand-mark"><window.MIcons.Lightning size={11} /></span>
            FitSplit
          </div>
          {["Dashboard", "Members", "Training", "Billing", "Reports"].map((it, i) => (
            <div key={it} className={`l3-screen__nav ${i === 0 ? "l3-screen__nav--on" : ""}`}>
              <span className="l3-screen__nav-dot" />
              {it}
            </div>
          ))}
        </div>
        <div className="l3-screen__main">
          <div className="l3-screen__head">
            <div>
              <small>THURSDAY · 28 MAY</small>
              <strong>Good morning, Priya</strong>
            </div>
            <div className="l3-screen__chip">
              <span className="l3-screen__live-dot" /> 14 in gym
            </div>
          </div>

          <div className="l3-screen__kpis">
            {[
              { l: "Renewals due", v: "18", tone: "danger" },
              { l: "Plans pending", v: "23", tone: "accent" },
              { l: "Pending payments", v: "7", tone: "warn" }
            ].map((k) => (
              <div key={k.l} className={`l3-screen__kpi l3-screen__kpi--${k.tone}`}>
                <small>{k.l}</small>
                <strong>{k.v}</strong>
              </div>
            ))}
          </div>

          <div className="l3-screen__panel">
            <div className="l3-screen__panel-head">
              <span><span className="l3-screen__pulse" /> PRIORITY QUEUE</span>
              <span className="l3-screen__count">12</span>
            </div>
            {[
              { tag: "EXPIRED", who: "Rohan Mehta", what: "Annual Pro · lapsed 4 days ago", tone: "danger", money: "₹14,999" },
              { tag: "PAYMENT", who: "Ananya Bose", what: "Half-year PT · cash submitted", tone: "warn", money: "₹18,500" },
              { tag: "NO PLAN", who: "Pari Saxena", what: "Joined 11 days ago · lose fat", tone: "accent" },
              { tag: "EXPIRING", who: "Devansh Joshi", what: "Quarterly · 5 days left", tone: "warning", money: "₹5,499" }
            ].map((r) => (
              <div key={r.who} className={`l3-screen__row l3-screen__row--${r.tone}`}>
                <span className={`l3-screen__tag l3-screen__tag--${r.tone}`}>{r.tag}</span>
                <div>
                  <strong>{r.who}</strong>
                  <small>{r.what}</small>
                </div>
                {r.money && <span className="l3-screen__money">{r.money}</span>}
                <button>Resolve</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function L3_MemberPhone() {
  return (
    <div className="l3-phone">
      <div className="l3-phone__notch" />
      <div className="l3-phone__body">
        <div className="l3-phone__greet">
          <small>YOUR COACH · PRIYA</small>
        </div>
        <div className="l3-phone__bubble">
          <p>Slight pause at the bottom of every bench rep today. Form > reps 💪</p>
        </div>
        <div className="l3-phone__session">
          <small>TODAY · WEEK 4</small>
          <strong>Day B · Push</strong>
        </div>
        <div className="l3-phone__exes">
          <div className="l3-phone__ex l3-phone__ex--done"><span>✓</span> Bench Press</div>
          <div className="l3-phone__ex l3-phone__ex--done"><span>✓</span> Incline DB</div>
          <div className="l3-phone__ex l3-phone__ex--active"><span /> Overhead Press</div>
        </div>
        <div className="l3-phone__cta">Continue workout</div>
      </div>
    </div>
  );
}

// ── For Owners ──────────────────────────────────────────────────────────
function L3_OwnerSection() {
  return (
    <section className="l3-section l3-role" id="l3-owner">
      <div className="lpd-container l3-role__inner">
        <div className="l3-role__copy">
          <span className="l3-role__pill">FOR OWNERS</span>
          <h2 className="l3-h2">Stop chasing payments and renewals in WhatsApp.</h2>
          <p>
            FitSplit's command room shows every member who needs renewal, plan assignment,
            or payment approval — sorted by urgency. One tap to resolve.
          </p>
          <ul className="l3-role__bullets">
            <li><window.MIcons.Check size={14} /> Unified priority queue across all member types</li>
            <li><window.MIcons.Check size={14} /> Live floor map & in-gym roster</li>
            <li><window.MIcons.Check size={14} /> Revenue & attendance trends with one click</li>
            <li><window.MIcons.Check size={14} /> Staff & roles · multi-branch support</li>
          </ul>
          <button className="lpd-btn lpd-btn--brand">
            Explore owner workspace <window.MIcons.ChevR size={13} />
          </button>
        </div>
        <div className="l3-role__visual l3-role__visual--right">
          <div className="l3-shot">
            <div className="l3-shot__chrome"><span /><span /><span /></div>
            <div className="l3-shot__body l3-shot__body--owner">
              <div className="l3-shot__row-head">FLOOR · LIVE</div>
              {[
                { z: "Free weights", v: 6, c: 10 },
                { z: "Cables", v: 4, c: 8 },
                { z: "Cardio", v: 2, c: 6 },
                { z: "Functional", v: 2, c: 6 }
              ].map((z) => {
                const pct = (z.v / z.c) * 100;
                return (
                  <div key={z.z} className="l3-shot__zone">
                    <div className="l3-shot__zone-h">
                      <span>{z.z}</span>
                      <strong>{z.v}/{z.c}</strong>
                    </div>
                    <div className="l3-shot__zone-bar">
                      <div style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── For Trainers ────────────────────────────────────────────────────────
function L3_TrainerSection() {
  return (
    <section className="l3-section l3-role l3-role--alt" id="l3-trainer">
      <div className="lpd-container l3-role__inner l3-role__inner--reverse">
        <div className="l3-role__copy">
          <span className="l3-role__pill">FOR TRAINERS</span>
          <h2 className="l3-h2">Assign programs once. Reuse forever.</h2>
          <p>
            Build a library of splits. Drop one onto a member in 2 minutes. They get it
            instantly in the app, with your form-cue notes attached.
          </p>
          <ul className="l3-role__bullets">
            <li><window.MIcons.Check size={14} /> Saved programs · drag-and-drop assign</li>
            <li><window.MIcons.Check size={14} /> Progressive-overload hints per member</li>
            <li><window.MIcons.Check size={14} /> Coach notes attached to today's session</li>
            <li><window.MIcons.Check size={14} /> Live console — see who's training right now</li>
          </ul>
          <button className="lpd-btn lpd-btn--brand">
            Explore trainer console <window.MIcons.ChevR size={13} />
          </button>
        </div>
        <div className="l3-role__visual l3-role__visual--left">
          <div className="l3-shot">
            <div className="l3-shot__chrome"><span /><span /><span /></div>
            <div className="l3-shot__body l3-shot__body--trainer">
              <div className="l3-shot__row-head">ASSIGN PROGRAM TO 6 SELECTED</div>
              <div className="l3-shot__select">
                <span>Hypertrophy 12wk · 4 day</span>
                <window.MIcons.ChevD size={12} />
              </div>
              <div className="l3-shot__chips">
                {["+ Coach note", "+ Trainer", "+ Start date"].map((c) => (
                  <span key={c} className="l3-shot__chip">{c}</span>
                ))}
              </div>
              <div className="l3-shot__action">
                <window.MIcons.Sparkle size={13} />
                Assign to 6 members
              </div>
              <div className="l3-shot__lift">
                <strong>Bench Press</strong>
                <div className="l3-shot__lift-row">
                  <span>SETS×REPS</span><strong>4 × 5–8</strong>
                </div>
                <div className="l3-shot__lift-row">
                  <span>LAST</span><strong>50 kg</strong>
                </div>
                <div className="l3-shot__lift-row">
                  <span>TARGET</span><strong className="l3-shot__bump">↑ 52.5 kg</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── For Members ─────────────────────────────────────────────────────────
function L3_MemberSection() {
  return (
    <section className="l3-section l3-role" id="l3-member">
      <div className="lpd-container l3-role__inner">
        <div className="l3-role__copy">
          <span className="l3-role__pill">FOR MEMBERS</span>
          <h2 className="l3-h2">A clean app for the actual workout.</h2>
          <p>
            Today's session. Coach's note. Tap to log a set. No scattered chat messages,
            no PDF programs to dig through.
          </p>
          <ul className="l3-role__bullets">
            <li><window.MIcons.Check size={14} /> Today's plan · one tap to start</li>
            <li><window.MIcons.Check size={14} /> Coach notes pinned to each session</li>
            <li><window.MIcons.Check size={14} /> Streaks, PRs, body metrics · all tracked</li>
            <li><window.MIcons.Check size={14} /> Dark mode · iOS & Android · PWA install</li>
          </ul>
          <button className="lpd-btn lpd-btn--brand">
            See the member app <window.MIcons.ChevR size={13} />
          </button>
        </div>
        <div className="l3-role__visual l3-role__visual--right">
          <div className="l3-phone l3-phone--large">
            <div className="l3-phone__notch" />
            <div className="l3-phone__body">
              <div className="l3-phone__greet">
                <small>YOUR COACH · PRIYA</small>
              </div>
              <div className="l3-phone__bubble">
                <p>Slight pause at the bottom of every bench rep today. Form > reps 💪</p>
              </div>
              <div className="l3-phone__session">
                <small>TODAY · WEEK 4 · DAY 2</small>
                <strong>Day B · Push</strong>
                <span>6 lifts · ~55m</span>
              </div>
              <div className="l3-phone__exes">
                <div className="l3-phone__ex l3-phone__ex--done"><span>✓</span> <div><strong>Bench Press</strong><em>4×5–8 · 52.5kg</em></div></div>
                <div className="l3-phone__ex l3-phone__ex--done"><span>✓</span> <div><strong>Incline DB</strong><em>3×8–10 · 18kg</em></div></div>
                <div className="l3-phone__ex l3-phone__ex--active"><span /> <div><strong>Overhead Press</strong><em>3×6–8 · ↑ try 27.5kg</em></div></div>
                <div className="l3-phone__ex"><span /> <div><strong>Lateral Raise</strong><em>4×12–15</em></div></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function L3_Numbers({ proof }) {
  return (
    <section className="l3-numbers">
      <div className="lpd-container">
        <div className="l3-numbers__grid">
          {proof.map((p) => (
            <div key={p.label} className="l3-num">
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

function L3_CTA({ onLogin, testimonial, partners }) {
  return (
    <section className="lpd-section l3-cta-section">
      <div className="lpd-container">
        <div className="l3-cta-card">
          <span className="l3-cta-card__mark">"</span>
          <blockquote>{testimonial.quote}</blockquote>
          <div className="l3-cta-card__attr">
            <span className="fm-avatar fm-avatar--md fs-avatar--c1">PN</span>
            <div>
              <strong>{testimonial.author}</strong>
              <small>{testimonial.role}</small>
            </div>
          </div>
        </div>
        <div className="l3-partners">
          {partners.map((p) => <span key={p}>{p}</span>)}
        </div>
        <div className="l3-final-cta">
          <h2 className="lpd-h2">Built for gyms that deliver coaching, not just access.</h2>
          <p className="lpd-sub">14 days free. No card required. Live in under a week.</p>
          <button className="lpd-btn lpd-btn--brand lpd-btn--lg" onClick={onLogin}>
            Start free trial <window.MIcons.ChevR size={14} />
          </button>
        </div>
      </div>
    </section>
  );
}

function L3_Footer() {
  return (
    <footer className="lpd-foot">
      <div className="lpd-container">
        <div className="lpd-foot__grid">
          <div>
            <a className="lpd-brand">
              <span className="lpd-brand__mark"><window.MIcons.Lightning size={15} /></span>
              FitSplit
            </a>
            <p className="lpd-foot__brand-blurb">Workout delivery, trainer coordination, member progress — one workspace.</p>
          </div>
          {[
            { h: "Product", items: ["Owner dashboard", "Trainer console", "Member app", "Pricing"] },
            { h: "Company", items: ["About", "Customers", "Blog", "Careers"] },
            { h: "Support", items: ["Help center", "Contact", "Status", "Privacy"] }
          ].map((c) => (
            <div key={c.h} className="lpd-foot__col">
              <h4>{c.h}</h4>
              <ul>{c.items.map((i) => <li key={i}><a>{i}</a></li>)}</ul>
            </div>
          ))}
        </div>
        <div className="lpd-foot__bar">
          <span>© 2026 FitSplit · fitsplit.in</span>
          <span>Built in India · for everyone serious about strength</span>
        </div>
      </div>
    </footer>
  );
}

function LandingThree() {
  const d = window.LANDING_MOCK;
  const [loginOpen, setLoginOpen] = useStateL3(false);
  return (
    <div className="lpd l3">
      <L3_Nav onLogin={() => setLoginOpen(true)} />
      <L3_Hero d={d} onLogin={() => setLoginOpen(true)} />
      <L3_OwnerSection />
      <L3_TrainerSection />
      <L3_MemberSection />
      <L3_Numbers proof={d.proof} />
      <L3_CTA onLogin={() => setLoginOpen(true)} testimonial={d.testimonial} partners={d.partners} />
      <L3_Footer />
    </div>
  );
}

window.LandingThree = LandingThree;
